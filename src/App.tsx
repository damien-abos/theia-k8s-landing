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

let initialized = false;
let initialAppName = '';
let initialAppDefinition = '';

function App(): JSX.Element {
  // Tous les hooks sont appelés inconditionnellement, AVANT tout early return
  // (règle des hooks React). Le cas `config === undefined` est traité ensuite.
  const [config] = useState(() => getTheiaCloudConfig());
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  // Authentification : remplace le bloc keycloak-js de la landing page upstream.
  const { email, token, enabled: useOidc, login, logout } = useAuth();

  if (config && !initialized) {
    initialAppName = config.appName;
    initialAppDefinition = config.appDefinition;
  }

  const [selectedAppName, setSelectedAppName] = useState(initialAppName);
  const [selectedAppDefinition, setSelectedAppDefinition] = useState(initialAppDefinition);

  useEffect(() => {
    if (config && !initialized) {
      initialized = true;
      const element = document.getElementById('selectapp');
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('appDef') || urlParams.has('appdef')) {
        const defaultSelection = urlParams.get('appDef') || urlParams.get('appdef');
        if (
          defaultSelection !== null &&
          isDefaultSelectionValueValid(defaultSelection, config.appDefinition, config.additionalApps)
        ) {
          if (element !== null && config.additionalApps && config.additionalApps.length > 0) {
            (element as HTMLSelectElement).value = defaultSelection;
            setSelectedAppName(
              (element as HTMLSelectElement).options[(element as HTMLSelectElement).selectedIndex].text
            );
            setSelectedAppDefinition((element as HTMLSelectElement).value);
          } else {
            setSelectedAppDefinition(defaultSelection);
            setSelectedAppName(defaultSelection);
          }
          console.log('Set ' + defaultSelection + ' as default selection');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  document.title = `${selectedAppName} - Try Now`;

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
