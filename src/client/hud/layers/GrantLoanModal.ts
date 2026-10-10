import { renderNumber } from "@openfront/engine-lib/Format";
import { within } from "@openfront/engine-lib/Util";
import { assetUrl } from "@openfront/shared/AssetUrls";
import { EventBus, GameEvent } from "@openfront/shared/EventBus";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SendLoanApproveIntentEvent } from "../../Transport";
import { showToast, translateText } from "../../Utils";
import { GameView, PlayerView } from "../../view";

const goldCoinIcon = assetUrl("images/GoldCoinIcon.svg");

export class OpenGrantLoanModalEvent implements GameEvent {
  constructor(public readonly borrower: PlayerView) {}
}

@customElement("grant-loan-modal")
export class GrantLoanModal extends LitElement {
  @property({ attribute: false }) eventBus: EventBus | null = null;
  @property({ type: Boolean }) open: boolean = false;
  @property({ attribute: false }) myPlayer: PlayerView | null = null;
  @property({ attribute: false }) target: PlayerView | null = null;
  @property({ attribute: false }) gameView: GameView | null = null;

  @state() private loanAmount: number = 0;
  @state() private durationSeconds: number = 60;

  createRenderRoot() {
    return this;
  }

  private getMaxGold(): number {
    if (!this.myPlayer || !this.myPlayer.isAlive()) return 0;
    return Math.max(0, Number(this.myPlayer.gold()));
  }

  protected updated(changedProperties: Map<string, unknown>) {
    if (
      (changedProperties.has("open") && this.open) ||
      changedProperties.has("target")
    ) {
      if (this.target) {
        const maxGold = this.getMaxGold();
        this.loanAmount = Math.floor(maxGold * 0.25);
        this.durationSeconds = 60;
      }
    }
  }

  private setPercentage(pct: number) {
    const maxGold = this.getMaxGold();
    this.loanAmount = Math.floor(maxGold * pct);
  }

  private setDuration(seconds: number) {
    this.durationSeconds = within(Math.floor(seconds), 5, 3600);
  }

  private closeModal() {
    this.dispatchEvent(new CustomEvent("close"));
  }

  private handleGrantLoan() {
    if (
      !this.target ||
      !this.myPlayer ||
      !this.eventBus ||
      this.loanAmount <= 0 ||
      this.durationSeconds < 5
    ) {
      return;
    }

    const amountBigInt = BigInt(Math.floor(this.loanAmount));
    if (this.myPlayer.gold() < amountBigInt) {
      showToast(translateText("grant_loan_modal.insufficient_gold"), "red");
      return;
    }

    const durationSec = Math.floor(this.durationSeconds);
    this.eventBus.emit(
      new SendLoanApproveIntentEvent(
        this.target,
        Math.floor(this.loanAmount),
        durationSec,
      ),
    );
    showToast(
      translateText("grant_loan_modal.loan_sent", {
        amount: renderNumber(this.loanAmount),
        name: this.target.displayName(),
        seconds: String(durationSec),
      }),
      "green",
    );
    this.dispatchEvent(
      new CustomEvent("confirm", {
        detail: { amount: this.loanAmount, closePanel: true },
      }),
    );
    this.closeModal();
  }

  private formatDurationLabel(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) {
      return `${mins}m ${secs}s (${seconds}s)`;
    }
    if (mins > 0) {
      return `${mins}m (${seconds}s)`;
    }
    return `${seconds}s`;
  }

  render() {
    if (!this.open || !this.target) return html``;

    const maxGold = this.getMaxGold();
    const amountPercentages = [
      { label: "10%", val: 0.1 },
      { label: "25%", val: 0.25 },
      { label: "50%", val: 0.5 },
      { label: "75%", val: 0.75 },
      { label: "100%", val: 1.0 },
    ];
    const durationPresets = [
      { label: "30s", val: 30 },
      { label: "1m", val: 60 },
      { label: "2m", val: 120 },
      { label: "3m", val: 180 },
      { label: "5m", val: 300 },
    ];

    return html`
      <div
        class="p-3 bg-zinc-800/90 rounded-xl border border-amber-500/40 mt-2"
        role="dialog"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2 text-sm font-bold text-amber-300">
            <img src=${goldCoinIcon} class="w-4 h-4" alt="" />
            <span>
              ${translateText("grant_loan_modal.title", {
                name: this.target.displayName(),
              })}
            </span>
          </div>
          <button
            @click=${() => this.closeModal()}
            class="text-zinc-400 hover:text-white text-lg leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <!-- Loan Amount Section -->
        <div class="mb-3">
          <div
            class="flex justify-between items-center text-xs text-zinc-300 mb-1.5"
          >
            <span>${translateText("grant_loan_modal.amount_label")}</span>
            <span class="font-mono font-bold text-amber-400" translate="no">
              ${renderNumber(this.loanAmount)} / ${renderNumber(maxGold)}
            </span>
          </div>

          <div class="grid grid-cols-5 gap-1.5 mb-2">
            ${amountPercentages.map(
              (p) => html`
                <button
                  @click=${() => this.setPercentage(p.val)}
                  class="py-1 px-2 rounded bg-zinc-700 hover:bg-zinc-600 text-xs font-semibold text-zinc-200 border border-zinc-600 transition-colors cursor-pointer"
                >
                  ${p.label}
                </button>
              `,
            )}
          </div>

          <input
            type="range"
            min="0"
            max=${maxGold}
            .value=${String(this.loanAmount)}
            @input=${(e: Event) => {
              this.loanAmount = Number((e.target as HTMLInputElement).value);
            }}
            class="w-full accent-amber-500 cursor-pointer mb-1.5"
          />

          <input
            type="number"
            min="1"
            max=${maxGold}
            .value=${String(this.loanAmount)}
            @input=${(e: Event) => {
              const val = Number((e.target as HTMLInputElement).value);
              this.loanAmount = within(
                Number.isFinite(val) ? Math.floor(val) : 0,
                0,
                maxGold,
              );
            }}
            class="w-full px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-white text-xs font-mono"
          />
        </div>

        <!-- Repayment Duration Section -->
        <div class="mb-3">
          <div
            class="flex justify-between items-center text-xs text-zinc-300 mb-1.5"
          >
            <span>${translateText("grant_loan_modal.duration_label")}</span>
            <span class="font-mono font-bold text-cyan-400" translate="no">
              ${this.formatDurationLabel(this.durationSeconds)}
            </span>
          </div>

          <div class="grid grid-cols-5 gap-1.5 mb-2">
            ${durationPresets.map(
              (d) => html`
                <button
                  @click=${() => this.setDuration(d.val)}
                  class="py-1 px-2 rounded ${this.durationSeconds === d.val
                    ? "bg-cyan-700 border-cyan-400 text-white"
                    : "bg-zinc-700 hover:bg-zinc-600 text-zinc-200 border-zinc-600"} text-xs font-semibold border transition-colors cursor-pointer"
                >
                  ${d.label}
                </button>
              `,
            )}
          </div>

          <input
            type="number"
            min="5"
            max="3600"
            .value=${String(this.durationSeconds)}
            @input=${(e: Event) => {
              const val = Number((e.target as HTMLInputElement).value);
              if (Number.isFinite(val)) {
                this.setDuration(val);
              }
            }}
            class="w-full px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-white text-xs font-mono"
          />
        </div>

        <p class="text-[11px] text-zinc-400 mb-3 leading-relaxed">
          ${translateText("grant_loan_modal.repayment_note")}
        </p>

        <!-- Confirm Button -->
        <button
          @click=${() => this.handleGrantLoan()}
          ?disabled=${this.loanAmount <= 0 || this.durationSeconds < 5}
          class="w-full py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer
            ${this.loanAmount > 0 && this.durationSeconds >= 5
            ? "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20"
            : "bg-zinc-700 text-zinc-500 cursor-not-allowed"}"
        >
          <span>${translateText("grant_loan_modal.confirm")}</span>
          ${this.loanAmount > 0
            ? html`<span
                class="text-xs opacity-90 font-normal"
                translate="no"
              >
                (${renderNumber(this.loanAmount)} / ${this.durationSeconds}s)
              </span>`
            : ""}
        </button>
      </div>
    `;
  }
}
