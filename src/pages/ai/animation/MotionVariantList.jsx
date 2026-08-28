import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lib/icons";

const PLACEHOLDERS = ["Balanced", "Subtle", "Expressive"];

export default function MotionVariantList({ variants, selectedVariantId, onSelect }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="animate-variants" data-empty={variants.length ? "false" : "true"}>
      {variants.length ? (
        <AnimatePresence initial={!reduceMotion}>
          {variants.map((variant, index) => {
            const selected = selectedVariantId === variant.variant.id;
            return (
              <motion.button
                key={variant.variant.id}
                type="button"
                aria-pressed={selected}
                data-selected={selected ? "true" : "false"}
                onClick={() => onSelect(variant.variant.id)}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2, delay: reduceMotion ? 0 : index * 0.04 }}
              >
                <span>0{index + 1}</span>
                <div>
                  <strong>{variant.variant.label}</strong>
                  <small>{variant.variant.energy} energy · {variant.variant.tempo}× tempo</small>
                </div>
                {selected ? <CheckCircle2 aria-label="Selected" /> : null}
              </motion.button>
            );
          })}
        </AnimatePresence>
      ) : (
        <div className="animate-variants__placeholder">
          {PLACEHOLDERS.map((label, index) => (
            <div key={label}>
              <span>0{index + 1}</span>
              <p><strong>{label}</strong><small>Awaiting motion plan</small></p>
              <i aria-hidden="true" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
