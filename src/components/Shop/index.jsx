/**
 * Shop/index.jsx
 * Random shop: buy items, deposit/withdraw bank gold.
 */

import React, { useState } from "react";
import { useGameStore, POTION_LIMITS, countPotions, isHealthPotion, isManaPotion } from "../../store/gameStore";
import { GameHeader, ItemCard, SectionLabel } from "../UI";
import InfoPanel from "../InfoPanel";
import styles from "./Shop.module.css";

export default function Shop() {
  const {
    player, gold, bank, bankUsesLeft, regionIdx,
    shopItems, buyItem, sellItem, depositBank, withdrawBank, leaveShop,
  } = useGameStore();

  const [bankInput, setBankInput] = useState("");
  const [bankMsg, setBankMsg]     = useState({ text: "", ok: true });
  const [lastBought, setLastBought] = useState(null);

  if (!player) return null;

  const potions = countPotions(player.consumables || []);

  const handleBuy = (item) => {
    if (gold < item.gold.total) return;
    const result = buyItem(item);
    if (result === "full") setLastBought("❌ Inventario lleno — vende un objeto primero");
    else if (result === "potion-limit") setLastBought("❌ Has alcanzado el límite de ese tipo de poción");
    else if (result) setLastBought(`✅ ${item.name} añadido`);
  };

  const handleDeposit = () => {
    const amt = parseInt(bankInput, 10);
    if (!amt || amt <= 0) return setBankMsg({ text: "Introduce una cantidad válida.", ok: false });
    if (amt > gold)       return setBankMsg({ text: "No tienes tanto oro encima.", ok: false });
    const r = depositBank(amt);
    if (r === "no-uses") return setBankMsg({ text: "Sin transacciones de banco restantes.", ok: false });
    setBankInput("");
    setBankMsg({ text: `Depositados ${amt}💰 en el banco.`, ok: true });
  };

  const handleWithdraw = () => {
    const amt = parseInt(bankInput, 10);
    if (!amt || amt <= 0) return setBankMsg({ text: "Introduce una cantidad válida.", ok: false });
    if (amt > bank)       return setBankMsg({ text: "No hay tanto en el banco.", ok: false });
    const r = withdrawBank(amt);
    if (r === "no-uses") return setBankMsg({ text: "Sin transacciones de banco restantes.", ok: false });
    setBankInput("");
    setBankMsg({ text: `Retirados ${amt}💰 del banco.`, ok: true });
  };

  const consumables    = shopItems.filter(i => i.consumable);
  const equipment      = shopItems.filter(i => !i.consumable);
  const inventoryFull  = (player.inventory?.length || 0) >= 6;
  const noBankUses     = bankUsesLeft <= 0;

  // Whether a given consumable can still be bought (potion-type limit)
  const potionAtLimit = (item) =>
    (isHealthPotion(item) && potions.health >= POTION_LIMITS.health) ||
    (isManaPotion(item)   && potions.mana   >= POTION_LIMITS.mana);

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
          <div className={styles.shopHeaderActions}>
            <InfoPanel />
            <button className="btn btn-gold" onClick={leaveShop}>
              Leave shop →
            </button>
          </div>
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
            <SectionLabel>
              Equipment{inventoryFull ? " — ⚠️ Inventario lleno, vende primero" : ""}
            </SectionLabel>
            <div className={styles.itemGrid}>
              {equipment.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  canAfford={gold >= item.gold.total && !inventoryFull}
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
            <SectionLabel>Pociones</SectionLabel>
            <div className={styles.potionCounters}>
              <span className={`${styles.potionCounter} ${potions.health >= POTION_LIMITS.health ? styles.potionFull : ""}`}>
                ❤️ Vida {potions.health}/{POTION_LIMITS.health}
              </span>
              <span className={`${styles.potionCounter} ${potions.mana >= POTION_LIMITS.mana ? styles.potionFull : ""}`}>
                🔷 Maná/Energía {potions.mana}/{POTION_LIMITS.mana}
              </span>
            </div>
            <div className={styles.itemGrid}>
              {consumables.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  canAfford={gold >= item.gold.total && !potionAtLimit(item)}
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
            <span className={`${styles.bankUses} ${noBankUses ? styles.bankUsesEmpty : ""}`}>
              Transacciones: {bankUsesLeft}/2
            </span>
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
            <button className="btn btn-gold" onClick={handleDeposit} disabled={noBankUses}>Deposit</button>
            <button className="btn btn-outline" onClick={handleWithdraw} disabled={noBankUses}>Withdraw</button>
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
