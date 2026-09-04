import React from "react";
import Marquee from "react-fast-marquee";
import ModelProviderGlyph from "../ai/ModelProviderGlyph";
import styles from "./AiProvidersBand.module.css";

if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const AI_OFFERINGS = [
  { provider: "anthropic", providerLabel: "Anthropic", model: "Claude 3.7 Sonnet" },
  { provider: "openai", providerLabel: "OpenAI", model: "GPT-5.4" },
  { provider: "google", providerLabel: "Google", model: "Gemini 3.6 Flash" },
  { provider: "deepseek", providerLabel: "DeepSeek", model: "DeepSeek V4 Flash" },
  { provider: "anthropic", providerLabel: "Anthropic", model: "Claude Sonnet 5" },
  { provider: "openai", providerLabel: "OpenAI", model: "GPT-5.6 Terra" },
  { provider: "google", providerLabel: "Google", model: "Gemini 3.1 Pro" },
  { provider: "xai", providerLabel: "xAI", model: "Grok 3" },
  { provider: "meta", providerLabel: "Meta", model: "Llama 3.3 70B" },
  { provider: "mistral", providerLabel: "Mistral AI", model: "Codestral" },
  { provider: "alibaba", providerLabel: "Alibaba", model: "Qwen 2.5 Coder" },
  { provider: "openai", providerLabel: "OpenAI", model: "GPT-5 Mini" },
];

export default function AiProvidersBand() {
  return (
    <div className={styles.bandContainer} aria-label="Supported AI companies and models">
      <Marquee
        speed={45}
        gradient={false}
        pauseOnHover={true}
        autoFill={true}
      >
        {AI_OFFERINGS.map((item, idx) => (
          <div key={`${item.provider}-${item.model}-${idx}`} className={styles.itemCard}>
            <ModelProviderGlyph provider={item.provider} size={18} />
            <span className={styles.providerName}>{item.providerLabel}</span>
            <span className={styles.dividerDot} aria-hidden="true" />
            <span className={styles.modelName}>{item.model}</span>
          </div>
        ))}
      </Marquee>
    </div>
  );
}
