import { useEffect } from 'react';
import { motion, useAnimate, stagger } from 'framer-motion';

export default function TextGenerateEffect({ words, className, style, filter = true, duration = 0.5 }) {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animate(
      'span',
      { opacity: 1, filter: filter ? 'blur(0px)' : 'none' },
      { duration: duration, delay: stagger(0.2) }
    );
  }, [animate, filter, duration]);

  const wordsArray = words.split(' ');

  return (
    <div className={className} style={style}>
      <div ref={scope}>
        {wordsArray.map((word, idx) => (
          <motion.span
            key={word + idx}
            style={{
              opacity: 0,
              filter: filter ? 'blur(10px)' : 'none',
              display: 'inline-block',
              marginRight: '0.35em',
            }}
          >
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
