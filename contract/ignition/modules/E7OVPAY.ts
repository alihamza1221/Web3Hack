//@ts-nocheck
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const Time_in_Futre = (now) => now + 1000 * 60; // 1 minute
const ONE_GWEI: BigInt = 0n;

const E7OVPAYModule = buildModule("E7OVPAYModule", (m) => {
  const now = Date.now();
  const unlockTime = m.getParameter("unlockTime", Time_in_Futre(now));
  const lockedAmount = m.getParameter("lockedAmount", 0n);

  const E7OVPAY = m.contract("E7OVPAY", [unlockTime], {
    value: lockedAmount,
  });

  return { E7OVPAY };
});

export default E7OVPAYModule;
