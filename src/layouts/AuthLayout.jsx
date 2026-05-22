import { motion } from 'framer-motion'
import { Outlet } from 'react-router-dom'
import { pageVariants } from '../animations/pageTransition'

export function AuthLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-warm-white">
      <motion.main
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="safe-top safe-x scroll-y-app flex min-h-0 flex-1 flex-col"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
