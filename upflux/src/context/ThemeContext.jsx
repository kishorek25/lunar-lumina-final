import { createContext, useState, useEffect, useContext } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        // Check localStorage for saved theme, default to 'dark' as it's the current app state
        return localStorage.getItem("theme") || "dark";
    });

    useEffect(() => {
        // Update data-theme attribute on body/html for CSS targeting
        document.documentElement.setAttribute("data-theme", theme);
        // Persist to localStorage
        localStorage.setItem("theme", theme);

        // Also apply a class to the body for tailwind or general styling
        document.body.className = theme;
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
