import './App.css';

import {
  AppDefinition,
  getTheiaCloudConfig,
  LaunchRequest,
  PingRequest,
  TheiaCloud,
  TheiaCloudConfig
} from '@eclipse-theiacloud/common';
import { useEffect, useState } from 'react';

import { useAuth } from './auth/useAuth';
import { AppLogo } from './components/AppLogo';
import { ErrorComponent } from './components/ErrorComponent';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Info } from './components/Info';
import { LaunchApp } from './components/LaunchApp';
import { Loading } from './components/Loading';
import { LoginButton } from './components/LoginButton';

function getInitialAppSelection(config: ReturnType<typeof getTheiaCloudConfig>): { appName: string; appDefinition: string } {
  const fallbackName = config?.appName ?? '';
  const fallbackDef = config?.appDefinition ?? '';
  if (!config) return { appName: fallbackName, appDefinition: fallbackDef };

  const urlParams = new URLSearchParams(window.location.search);
  const defaultSelection = urlParams.get('appDef') ?? urlParams.get('appdef');
  if (defaultSelection && isDefaultSelectionValueValid(defaultSelection, config.appDefinition, config.additionalApps)) {
    return { appName: defaultSelection, appDefinition: defaultSelection };
  }
  return { appName: fallbackName, appDefinition: fallbackDef };
}

function App() {
  // All hooks are called unconditionally, BEFORE any early return
  // (React rules of hooks). The `config === undefined` case is handled below.
  const [config] = useState(() => getTheiaCloudConfig());
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  // Authentication: replaces the keycloak-js block from the upstream landing page.
  const { email, token, enabled: useOidc, login, logout } = useAuth();

  const [selectedAppName, setSelectedAppName] = useState(() => getInitialAppSelection(config).appName);
  const [selectedAppDefinition, setSelectedAppDefinition] = useState(() => getInitialAppSelection(config).appDefinition);

  useEffect(() => {
    document.title = `${selectedAppName} - Try Now`;
  }, [selectedAppName]);

  if (config === undefined) {
    return (
      <div className='App'>
        <strong>FATAL: Theia Cloud configuration could not be found.</strong>
      </div>
    );
  }

  const handleStartSession = (appDefinition: string): void => {
    console.log('Launching ' + appDefinition);
    setLoading(true);
    setError(undefined);

    TheiaCloud.ping(PingRequest.create(config.serviceUrl, TheiaCloudConfig.getServiceAuthToken(config)))
      .then(() => {
        const workspace = config.useEphemeralStorage
          ? undefined
          : 'ws-' + TheiaCloudConfig.getServiceAuthToken(config) + '-' + selectedAppDefinition + '-' + email;
        TheiaCloud.launchAndRedirect(
          config.useEphemeralStorage
            ? LaunchRequest.ephemeral(
                config.serviceUrl,
                TheiaCloudConfig.getServiceAuthToken(config),
                appDefinition,
                5,
                email
              )
            : LaunchRequest.createWorkspace(
                config.serviceUrl,
                TheiaCloudConfig.getServiceAuthToken(config),
                appDefinition,
                5,
                email,
                workspace
              ),
          { timeout: 60000, retries: 5, accessToken: token }
        )
          .catch((err: Error) => {
            if (err && (err as unknown as { status?: number }).status === 473) {
              setError(
                `The app definition '${appDefinition}' is not available in the cluster.\n` +
                  'Please try launching another application.'
              );
              return;
            }
            setError(err.message);
          })
          .finally(() => {
            setLoading(false);
          });
      })
      .catch(() => {
        setError(
          'Sorry, we are performing some maintenance at the moment.\n' +
            "Please try again later. Usually maintenance won't last longer than 60 minutes.\n\n"
        );
        setLoading(false);
      });
  };

  const needsLogin = useOidc && !token;
  const logoFileExtension = config.logoFileExtension ?? 'svg';

  return (
    <div className='App'>
      {useOidc ? (
        <Header email={email} authenticate={login} logout={token ? logout : undefined} />
      ) : (
        <div className='header'></div>
      )}
      <div className='body'>
        {loading ? (
          <Loading logoFileExtension={logoFileExtension} text={config.loadingText} />
        ) : (
          <div>
            <div>
              <AppLogo fileExtension={logoFileExtension} />
              <p>
                {needsLogin ? (
                  <LoginButton login={login} />
                ) : (
                  <LaunchApp
                    appName={selectedAppName}
                    appDefinition={selectedAppDefinition}
                    onStartSession={handleStartSession}
                  />
                )}
              </p>
            </div>
          </div>
        )}
        <ErrorComponent message={error} />
        {!error && (
          <Info usesLogin={useOidc} disable={config.disableInfo} text={config.infoText} title={config.infoTitle} />
        )}
        <Footer
          appDefinition={config.appDefinition}
          appName={config.appName}
          additionalApps={config.additionalApps !== undefined ? config.additionalApps : []}
          setSelectedAppName={setSelectedAppName}
          setSelectedAppDefinition={setSelectedAppDefinition}
        />
      </div>
    </div>
  );
}

function isDefaultSelectionValueValid(
  defaultSelection: string,
  appDefinition: string,
  additionalApps?: AppDefinition[]
): boolean {
  if (defaultSelection === appDefinition) {
    return true;
  }
  if (additionalApps && additionalApps.length > 0) {
    return additionalApps.map(def => def.appId).filter(appId => appId === defaultSelection).length > 0;
  }
  return true;
}

export default App;
