import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import SubscribeTabContainer from "../SubscribeTabContainer";

export default function FeaturesSection({ featureCards, navigate }) {
  return (
    <section className="py-24 px-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
          Powerful AI Tools for Roblox Creators
        </h2>
      </motion.div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {featureCards.map((card, index) => (
          <motion.article
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 p-8 hover:border-white/20 transition-all duration-500 group flex flex-col"
            itemScope
            itemType="https://schema.org/Service"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
            ></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-[#9b5de5]/20 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>

            <div className="relative flex-1">
              {card.isSubscribeTab ? (
                <>
                  <SubscribeTabContainer
                    onSubscribe={() => navigate("/subscribe")}
                    isSubscribed={false}
                    className="!bg-transparent !border-none !shadow-none p-0"
                  />
                  <img
                    src="/feature-premium.webp"
                    alt="Premium AI features for Roblox development"
                    width="800"
                    height="600"
                    loading="lazy"
                    decoding="async"
                    className="rounded-lg border border-gray-800 mb-4 w-full"
                  />
                </>
              ) : (
                <>
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4`}
                  >
                    {card.icon && <card.icon className="h-6 w-6 text-white" />}
                  </div>
                  {/* Optional image placeholder for Script AI and Secure Testing */}
                  {card.id === 1 && (
                    <img
                      src="/feature-script-ai.webp"
                      alt="Roblox script generator preview"
                      width="800"
                      height="600"
                      loading="lazy"
                      decoding="async"
                      className="rounded-lg border border-gray-800 mb-4 w-full"
                    />
                  )}
                  {card.id === 3 && (
                    <img
                      src="/feature-secure.webp"
                      alt="Secure testing environment for Roblox mods"
                      width="800"
                      height="600"
                      loading="lazy"
                      decoding="async"
                      className="rounded-lg border border-gray-800 mb-4 w-full"
                    />
                  )}
                  <h3 className="text-xl font-bold mb-2" itemProp="name">{card.title}</h3>
                  <p className="text-gray-400" itemProp="description">{card.description}</p>
                  <button
                    className="mt-6 px-4 py-2 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:shadow-lg hover:shadow-[#9b5de5]/20 transform hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center"
                    onClick={() => navigate(card.button.href)}
                    type="button"
                    aria-label={`Learn more about ${card.title} for Roblox scripting`}
                  >
                    {card.button.text}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
