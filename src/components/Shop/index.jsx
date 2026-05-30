/**
 * Shop/index.jsx
 * Random shop: buy items, deposit/withdraw bank gold.
 */

import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { GameHeader, ItemCard, SectionLabel } from "../UI";
import styles from "./Shop.module.css";

export default function Shop() {
  const {
    player, gold, bank, regionIdx,
    shopItems, buyItem, sellItem, depositBank, withdrawBank, leaveShop,
  } = useGameStore();

  const [bankInput, setBankInput] = useState("");
  const [bankMsg, setBankMsg]     = useState({ text: "", ok: true });
  const [lastBought, setLastBought] = useState(null);

  if (!player) return null;

  const handleBuy = (item) => {
    if (gold < item.gold.total) return;
    const ok = buyItem(item);
    if (ok) setLastBought(item.name);
  };

  const handleDeposit = () => {
    const amt = parseInt(bankInput, 10);
    if (!amt || amt <= 0) return setBankMsg({ text: "Enter a valid amount.", ok: false });
    if (amt > gold)       return setBankMsg({ text: "Not enough gold on you.", ok: false });
    depositBank(amt);
    setBankInput("");
    setBankMsg({ text: `Deposited ${amt}💰 into the bank.`, ok: true });
  };

  const handleWithdraw = () => {
    const amt = parseInt(bankInput, 10);
    if (!amt || amt <= 0) return setBankMsg({ text: "Enter a valid amount.", ok: false });
    if (amt > bank)       return setBankMsg({ text: "Not that much in the bank.", ok: false });
    withdrawBank(amt);
    setBankInput("");
    setBankMsg({ text: `Withdrew ${amt}💰 from the bank.`, ok: true });
  };

  const consumables  = shopItems.filter(i => i.consumable);
  const equipment    = shopItems.filter(i => !i.consumable);

  return (
    <div className={`${styles.screen} screen-enter`}>
      <GameHeader player={player} gold={gold} bank={bank} />

      <div className={styles.content}>
        <div className={styles.shopHeader}>
          <div>
            <h2 className={styles.shopTitle}>🏪 Traveling Shop</h2>
            <p className={styles.shopSub}>
              Stock refreshes after each combat. You have{" "}
              <strong className="text-gold">{gold}💰</strong> on you.
            </p>
          </div>
          <button className="btn btn-gold" onClick={leaveShop}>
            Leave shop →
          </button>
        </div>

        {lastBought && (
          <div className={styles.boughtBanner}>
            ✅ {lastBought} added to inventory!
            <button className={styles.bannerClose} onClick={() => setLastBought(null)}>×</button>
          </div>
        )}

        {/* ── Equipment ─────────────────────────────────────────────── */}
        {equipment.length > 0 && (
          <section>
            <SectionLabel>Equipment</SectionLabel>
            <div className={styles.itemGrid}>
              {equipment.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  canAfford={gold >= item.gold.total}
                  showCost
                  size="md"
                  onBuy={handleBuy}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Consumables ───────────────────────────────────────────── */}
        {consumables.length > 0 && (
          <section style={{ marginTop: 16 }}>
            <SectionLabel>Consumables (used immediately)</SectionLabel>
            <div className={styles.itemGrid}>
              {consumables.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  canAfford={gold >= item.gold.total}
                  showCost
                  size="sm"
                  onBuy={handleBuy}
                />
              ))}
            </div>
          </section>
        )}

        <hr className="divider" />

        {/* ── Bank ──────────────────────────────────────────────────── */}
        <section className={styles.bankSection}>
          <div className={styles.bankHeader}>
            <div>
              <h3 className={styles.bankTitle}>🏦 Bank of Runeterra</h3>
              <p className={styles.bankSub}>
                Gold in the bank is <strong>safe even if you die.</strong>{" "}
                Gold on you is lost on defeat.
              </p>
            </div>
          </div>

          <div className={styles.bankBalances}>
            <div className={styles.balance}>
              <span className={styles.balanceLabel}>In your pocket</span>
              <span className={styles.balanceValue + " text-gold"}>{gold}💰</span>
            </div>
            <div className={styles.balanceDivider}>⇄</div>
            <div className={styles.balance}>
              <span className={styles.balanceLabel}>In the bank</span>
              <span className={styles.balanceValue + " text-green"}>{bank}💰</span>
            </div>
          </div>

          <div className={styles.bankControls}>
            <input
              type="number"
              className={styles.bankInput}
              placeholder="Amount…"
              value={bankInput}
              min={0}
              onChange={e => { setBankInput(e.target.value); setBankMsg({ text: "", ok: true }); }}
              onKeyDown={e => e.key === "Enter" && handleDeposit()}
            />
            <button className="btn btn-gold" onClick={handleDeposit}>Deposit</button>
            <button className="btn btn-outline" onClick={handleWithdraw}>Withdraw</button>
          </div>

          {bankMsg.text && (
            <p className={`${styles.bankMsg} ${bankMsg.ok ? styles.bankMsgOk : styles.bankMsgErr}`}>
              {bankMsg.text}
            </p>
          )}
        </section>

        <hr className="divider" />

        {/* ── Sell inventory ────────────────────────────────────────── */}
        <section>
          <SectionLabel>Your Inventory — Sell items ({player.inventory?.length || 0}/6)</SectionLabel>
          <p className={styles.sellHint}>Click an item to sell it at half price.</p>
          <div className={styles.sellRow}>
            {Array.from({ length: 6 }).map((_, i) => {
              const item = player.inventory?.[i];
              const sellValue = item ? (item.gold?.sell || Math.floor((item.gold?.total || 0) / 2)) : 0;
              return item ? (
                <button
                  key={i}
                  className={styles.sellSlot}
                  onClick={() => sellItem(i)}
                  data-tooltip={`${item.name}\nSell for ${sellValue}💰`}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className={styles.sellImg}
                    onError={e => { e.target.style.display = "none"; }}
                  />
                  <div className={styles.sellPrice}>+{sellValue}💰</div>
                </button>
              ) : (
                <div key={i} className={styles.sellSlotEmpty} />
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
