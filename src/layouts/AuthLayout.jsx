import { motion } from 'framer-motion'
import { Outlet } from 'react-router-dom'
import { pageVariants } from '../animations/pageTransition'

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <motion.main
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="safe-top safe-bottom flex flex-1 flex-col"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
