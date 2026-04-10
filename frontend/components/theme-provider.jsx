"use client"

import { createContext, useContext, useState, useEffect } from "react"

const ThemeContext = createContext({
	theme: "dark",
	toggleTheme: () => {},
})

export function useTheme() {
	return useContext(ThemeContext)
}

export default function ThemeProvider({ children }) {
	const [theme, setTheme] = useState("dark")
	const [mounted, setMounted] = useState(false)

	// Load saved theme from localStorage on mount
	useEffect(() => {
		const saved = localStorage.getItem("fundxprout-theme")
		if (saved === "light" || saved === "dark") {
			setTheme(saved)
		}
		setMounted(true)
	}, [])

	// Apply theme class to <html> and persist to localStorage
	useEffect(() => {
		if (!mounted) return
		const html = document.documentElement

		if (theme === "dark") {
			html.classList.add("dark")
			html.classList.remove("light")
			html.setAttribute("data-theme", "dark")
		} else {
			html.classList.remove("dark")
			html.classList.add("light")
			html.setAttribute("data-theme", "light")
		}

		localStorage.setItem("fundxprout-theme", theme)
	}, [theme, mounted])

	const toggleTheme = () => {
		setTheme((prev) => (prev === "dark" ? "light" : "dark"))
	}

	// Prevent flash of wrong theme
	if (!mounted) {
		return <>{children}</>
	}

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	)
}
