// @ts-nocheck
import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("E7OVPAY", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const _E7OVPAY = await hre.ethers.getContractFactory("E7OVPAY");
    const E7OVPAY = await _E7OVPAY.deploy(unlockTime, { value: lockedAmount });

    return { E7OVPAY, unlockTime, lockedAmount, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { E7OVPAY, unlockTime } = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await E7OVPAY.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right owner", async function () {
      const { E7OVPAY, owner } = await loadFixture(deployOneYearLockFixture);

      expect(await E7OVPAY.owner()).to.equal(owner.address);
    });

    it("Should receive and store the funds to lock", async function () {
      const { E7OVPAY, lockedAmount } = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await hre.ethers.provider.getBalance(E7OVPAY.target)).to.equal(
        lockedAmount
      );
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      // We don't use the fixture here because we want a different deployment
      const latestTime = await time.latest();
      const E7OVPAY = await hre.ethers.getContractFactory("E7OVPAY");
      await expect(E7OVPAY.deploy(latestTime, { value: 1 })).to.be.revertedWith(
        "Unlock time should be in the future"
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { E7OVPAY } = await loadFixture(deployOneYearLockFixture);

        await expect(E7OVPAY.withdraw()).to.be.revertedWith(
          "You can't withdraw yet"
        );
      });

      it("Should revert with the right error if called from another account", async function () {
        const { E7OVPAY, unlockTime, otherAccount } = await loadFixture(
          deployOneYearLockFixture
        );

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        // We use lock.connect() to send a transaction from another account
        //@ts-ignore
        await expect(
          E7OVPAY.connect(otherAccount).withdraw()
        ).to.be.revertedWith("You aren't the owner");
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { E7OVPAY, unlockTime } = await loadFixture(
          deployOneYearLockFixture
        );

        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockTime);

        await expect(E7OVPAY.withdraw()).not.to.be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { E7OVPAY, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(E7OVPAY.withdraw())
          .to.emit(E7OVPAY, "Withdrawal")
          .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
      });
    });

    describe("Payment", () => {
      it("Should allow user to pay amount above .35 eth", async () => {
        const { E7OVPAY, unlockTime } = await loadFixture(
          deployOneYearLockFixture
        );
        await time.increaseTo(unlockTime);

        // 0.001 eth in wei;
        const wei = 1000000000000000;
        await expect(E7OVPAY.payment({ value: wei }))
          .to.emit(E7OVPAY, "Payment")
          .withArgs(wei, anyValue);
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { E7OVPAY, unlockTime, lockedAmount, owner } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(E7OVPAY.withdraw()).to.changeEtherBalances(
          [owner, E7OVPAY],
          [lockedAmount, -lockedAmount]
        );
      });
    });
  });
});
