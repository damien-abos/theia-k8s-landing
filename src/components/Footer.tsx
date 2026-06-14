import { AppDefinition } from '@eclipse-theiacloud/common';
import React from 'react';

interface FooterProps {
  appDefinition: string;
  appName: string;
  additionalApps: AppDefinition[];
  setSelectedAppName: (name: string) => void;
  setSelectedAppDefinition: (appDefinition: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  appDefinition,
  appName,
  additionalApps,
  setSelectedAppName,
  setSelectedAppDefinition
}: FooterProps) => (
  <div className='footer'>
    {additionalApps.length > 0 && (
      <p>
        <label htmlFor='selectapp'>Application:&nbsp;</label>
        <select
          id='selectapp'
          onChange={event => {
            const select = event.target as HTMLSelectElement;
            setSelectedAppName(select.options[select.selectedIndex].text);
            setSelectedAppDefinition(select.value);
          }}
        >
          <option value={appDefinition}>{appName}</option>
          {additionalApps.map((app, index) => (
            <option key={index} value={app.appId}>
              {app.appName}
            </option>
          ))}
        </select>
      </p>
    )}
    <p>
      Powered by{' '}
      <a href='https://theia-cloud.io' target='_blank' rel='noreferrer'>
        Theia Cloud
      </a>
    </p>
    <p>
      Having trouble?{' '}
      <a href='https://github.com/eclipse-theia/theia-cloud/issues' target='_blank' rel='noreferrer'>
        Report an issue
      </a>
    </p>
  </div>
);
