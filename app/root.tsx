import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { I18nextProvider } from 'react-i18next';
import { ClientOnly } from 'remix-utils/client-only';
import { cssTransition, ToastContainer } from 'react-toastify';
import i18n, { normalizeLanguage } from './lib/i18n';
import { logStore } from './lib/stores/logs';
import { themeStore } from './lib/stores/theme';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';
import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import { stripIndents } from './utils/stripIndent';

import 'virtual:uno.css';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <I18nextProvider i18n={i18n}>
      <>
        <ClientOnly>{() => <DndProvider backend={HTML5Backend}>{children}</DndProvider>}</ClientOnly>
        <ToastContainer
          closeButton={({ closeToast }) => {
            return (
              <button className="Toastify__close-button" onClick={closeToast}>
                <div className="i-ph:x text-lg" />
              </button>
            );
          }}
          icon={({ type }) => {
            switch (type) {
              case 'success': {
                return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
              }
              case 'error': {
                return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
              }
            }

            return undefined;
          }}
          position="bottom-right"
          pauseOnFocusLoss
          transition={toastAnimation}
          autoClose={3000}
        />
        <ScrollRestoration />
        <Scripts />
      </>
    </I18nextProvider>
  );
}

export default function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    const syncLanguage = (language: string) => {
      const normalizedLanguage = normalizeLanguage(language);
      localStorage.setItem('bolt_language', normalizedLanguage);

      if (i18n.language !== normalizedLanguage) {
        void i18n.changeLanguage(normalizedLanguage);
      }
    };

    try {
      const storedLanguage = localStorage.getItem('bolt_language');

      if (storedLanguage) {
        syncLanguage(storedLanguage.replace(/^"|"$/g, ''));
      } else {
        const storedProfile = localStorage.getItem('bolt_user_profile');

        if (storedProfile) {
          const profile = JSON.parse(storedProfile) as { language?: string };
          syncLanguage(profile.language ?? 'en');
        }
      }
    } catch (error) {
      logStore.logError('Failed to initialize language settings', error);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'bolt_language' && event.newValue) {
        syncLanguage(event.newValue.replace(/^"|"$/g, ''));
        return;
      }

      if (event.key === 'bolt_user_profile' && event.newValue) {
        try {
          const profile = JSON.parse(event.newValue) as { language?: string };

          if (profile.language) {
            syncLanguage(profile.language);
          }
        } catch (error) {
          logStore.logError('Failed to sync language from storage event', error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Initialize debug logging with improved error handling
    import('./utils/debugLogger')
      .then(({ debugLogger }) => {
        /*
         * The debug logger initializes itself and starts disabled by default
         * It will only start capturing when enableDebugMode() is called
         */
        const status = debugLogger.getStatus();
        logStore.logSystem('Debug logging ready', {
          initialized: status.initialized,
          capturing: status.capturing,
          enabled: status.enabled,
        });
      })
      .catch((error) => {
        logStore.logError('Failed to initialize debug logging', error);
      });

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
