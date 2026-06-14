import React from 'react';

interface InfoProps {
  usesLogin: boolean;
  disable?: boolean;
  text?: string;
  title?: string;
}

export const Info: React.FC<InfoProps> = ({ usesLogin, disable, text, title }: InfoProps) => {
  if (disable) {
    return null;
  }
  const calculatedTitle = title ?? 'How does this work?';
  const calculatedText =
    text ??
    (usesLogin
      ? 'Use the button in the top right corner to login. Afterwards, launch a session by clicking the ' +
        'button above this notice. Once the session is ready, you will be redirected automatically.'
      : 'Launch a session by clicking the button above this notice. Once the session is ready, you will be ' +
        'redirected automatically.');
  return (
    <div className='App__info'>
      <h2>{calculatedTitle}</h2>
      <p>{calculatedText}</p>
    </div>
  );
};
