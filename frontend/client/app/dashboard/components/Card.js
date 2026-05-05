"use client";
import { motion } from "framer-motion";

export default function Card({children}){

  return(
    <motion.div
      whileHover={{scale:1.03}}
      style={{
        background:"rgba(255,255,255,0.9)",
        backdropFilter:"blur(10px)",
        padding:25,
        borderRadius:14,
        boxShadow:"0 8px 20px rgba(0,0,0,0.08)"
      }}
    >
      {children}
    </motion.div>
  )
}
