import { mount } from 'svelte'
// Las fuentes viajan con la web, sin pedir nada a Google: solo los pesos que se usan y solo el
// alfabeto latino, que cubre el español.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-400-italic.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/pixelify-sans/latin-500.css'
import '@fontsource/pixelify-sans/latin-700.css'
import App from './App.svelte'
import './styles.css'

mount(App, { target: document.getElementById('root') })
