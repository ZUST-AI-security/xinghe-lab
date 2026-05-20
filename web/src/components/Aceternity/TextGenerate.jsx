import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TextGenerate({ words, className, style, delay = 0.08 }) {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    const wordArr = words.split(' ');
    setVisible([]);
    wordArr.forEach((word, i) => {
      setTimeout(() => {
        setVisible((prev) => [...prev, word]);
      }, i * delay * 1000);
    });
  }, [words, delay]);

  return (
    <div className={className} style={{ display: 'inline', ...style }}>
      <AnimatePresence>
        {visible.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            initial={{ opacity: 0, filter: 'blur(8px)', y: 4 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ display: 'inline-block', marginRight: '0.35em' }}
          >
            {word}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
