import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MakeoverMaths } from './game/MakeoverMaths'
createRoot(document.getElementById('app')!).render(<StrictMode><MakeoverMaths /></StrictMode>)
