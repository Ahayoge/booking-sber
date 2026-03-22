// src/main.tsx
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ConfigProvider, App, theme as antTheme } from "antd";
import ruRU from "antd/locale/ru_RU";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import AppComponent from "./App";
import "./index.css";
import { useThemeStore } from "@/store/theme.store";

// Устанавливаем русскую локаль для dayjs — DatePicker будет на русском
dayjs.locale("ru");

function Root() {
  const { isDark } = useThemeStore();

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        // ✅ Переключаем алгоритм темы — defaultAlgorithm (светлая) или darkAlgorithm
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#21A038",
          borderRadius: 6,
          fontFamily: "'SB Sans Display', -apple-system, sans-serif",
        },
      }}
    >
      <App>
        <AppComponent />
      </App>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Root />
  </BrowserRouter>,
);
