import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ListChecks } from "lib/icons";

export default function MotionTaskList({ items, note = "" }) {
  const reduceMotion = useReducedMotion();
  const completed = items.filter((item) => item.complete).length;

  return (
    <section className="animate-quality">
      <div className="animate-section-heading">
        <h3><ListChecks aria-hidden="true" /> Motion checks</h3>
        <span>{completed}/{items.length}</span>
      </div>
      <motion.ul initial={false}>
        {items.map((item, index) => (
          <motion.li
            key={item.label}
            data-pass={item.complete ? "true" : "idle"}
            initial={reduceMotion ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, delay: reduceMotion ? 0 : index * 0.035 }}
          >
            <i aria-hidden="true" /> {item.label}
          </motion.li>
        ))}
      </motion.ul>
      {note ? <p>{note}</p> : null}
    </section>
  );
}
