import React, { ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';

type PresetType =
  | 'fade' | 'slide' | 'scale' | 'blur' | 'blur-slide'
  | 'zoom' | 'flip' | 'bounce' | 'rotate' | 'swing';

type AnimatedGroupProps = {
  children: ReactNode;
  className?: string;
  variants?: { container?: Variants; item?: Variants };
  preset?: PresetType;
};

const defaultContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const defaultItem: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const presets: Record<PresetType, { container: Variants; item: Variants }> = {
  fade:         { container: defaultContainer, item: { hidden: { opacity: 0 }, visible: { opacity: 1 } } },
  slide:        { container: defaultContainer, item: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } } },
  scale:        { container: defaultContainer, item: { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } } },
  blur:         { container: defaultContainer, item: { hidden: { opacity: 0, filter: 'blur(4px)' }, visible: { opacity: 1, filter: 'blur(0px)' } } },
  'blur-slide': { container: defaultContainer, item: { hidden: { opacity: 0, filter: 'blur(4px)', y: 20 }, visible: { opacity: 1, filter: 'blur(0px)', y: 0 } } },
  zoom:         { container: defaultContainer, item: { hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } } } },
  flip:         { container: defaultContainer, item: { hidden: { opacity: 0, rotateX: -90 }, visible: { opacity: 1, rotateX: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } } } },
  bounce:       { container: defaultContainer, item: { hidden: { opacity: 0, y: -50 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 10 } } } },
  rotate:       { container: defaultContainer, item: { hidden: { opacity: 0, rotate: -180 }, visible: { opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } } } },
  swing:        { container: defaultContainer, item: { hidden: { opacity: 0, rotate: -10 }, visible: { opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 8 } } } },
};

export function AnimatedGroup({ children, className, variants, preset }: AnimatedGroupProps) {
  const selected = preset ? presets[preset] : { container: defaultContainer, item: defaultItem };
  const containerVariants = variants?.container ?? selected.container;
  const itemVariants = variants?.item ?? selected.item;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
    >
      {React.Children.map(children, (child, i) => (
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
