import React, { useState } from 'react';

export default function LifeCounter3D() {
  const [lives, setLives] = useState(3);
  const maxLives = 6;

  const removeLive = () => {
    if (lives > 0) setLives(lives - 1);
  };

  const addLive = () => {
    if (lives < maxLives) setLives(lives + 1);
  };

  const reset = () => {
    setLives(maxLives);
  };

  // Generate display string: vertical bars for lives, circles for empty
  const generateDisplay = () => {
    let display = '';
    for (let i = 0; i < lives; i++) {
      display += 'I ';
    }
    for (let i = 0; i < maxLives - lives; i++) {
      display += 'O ';
    }
    return display;
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Courier New", monospace',
      }}
    >
      {/* CRT Display Container */}
      <div
        style={{
          position: 'relative',
          width: '600px',
          height: '300px',
          backgroundColor: '#1a1a1a',
          border: '20px solid #2a2a2a',
          borderRadius: '10px',
          boxShadow: `
            inset 0 0 30px rgba(0, 0, 0, 0.8),
            inset 2px 2px 5px rgba(255, 255, 255, 0.1),
            0 20px 60px rgba(0, 0, 0, 0.9),
            0 0 40px rgba(255, 68, 68, 0.2)
          `,
          overflow: 'hidden',
        }}
      >
        {/* Screen background */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backgroundColor: '#0d0d0d',
            background: `
              repeating-linear-gradient(
                0deg,
                rgba(0, 0, 0, 0.15) 0px,
                rgba(0, 0, 0, 0.15) 1px,
                transparent 1px,
                transparent 2px
              )
            `,
            zIndex: 0,
          }}
        />

        {/* CRT Content */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            textShadow: '0 0 10px rgba(0, 255, 0, 0.5)',
          }}
        >
          {/* Top display - Bullets and Skull */}
          <div
            style={{
              fontSize: '80px',
              fontWeight: 'bold',
              color: '#00ff00',
              letterSpacing: '20px',
              marginBottom: '20px',
              textAlign: 'center',
              filter: 'drop-shadow(0 0 5px rgba(0, 255, 0, 0.6))',
            }}
          >
            {generateDisplay()}
          </div>

          {/* Skull symbol */}
          <div
            style={{
              fontSize: '60px',
              color: '#ff4444',
              marginBottom: '20px',
              filter: 'drop-shadow(0 0 10px rgba(255, 68, 68, 0.8))',
              animation: lives === 0 ? 'pulse 0.5s infinite' : 'none',
            }}
          >
            ☠
          </div>

          {/* Bottom display - Empty circles */}
          <div
            style={{
              fontSize: '80px',
              fontWeight: 'bold',
              color: '#ff4444',
              letterSpacing: '20px',
              textAlign: 'center',
              filter: 'drop-shadow(0 0 5px rgba(255, 68, 68, 0.6))',
            }}
          >
            {Array(maxLives - lives).fill('O').join(' ')}
          </div>
        </div>

        {/* Screen glare effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Control Buttons */}
      <div
        style={{
          position: 'absolute',
          bottom: '50px',
          display: 'flex',
          gap: '20px',
          zIndex: 10,
        }}
      >
        <button
          onClick={removeLive}
          style={{
            padding: '12px 24px',
            backgroundColor: '#ff4444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: '0 0 20px rgba(255, 68, 68, 0.5)',
            transition: 'all 0.2s',
            fontFamily: '"Courier New", monospace',
          }}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = '0 0 30px rgba(255, 68, 68, 0.8)';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = '0 0 20px rgba(255, 68, 68, 0.5)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          Damage
        </button>

        <button
          onClick={addLive}
          style={{
            padding: '12px 24px',
            backgroundColor: '#44ff44',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: '0 0 20px rgba(68, 255, 68, 0.5)',
            transition: 'all 0.2s',
            fontFamily: '"Courier New", monospace',
          }}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = '0 0 30px rgba(68, 255, 68, 0.8)';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = '0 0 20px rgba(68, 255, 68, 0.5)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          Heal
        </button>

        <button
          onClick={reset}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4444ff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: '0 0 20px rgba(68, 68, 255, 0.5)',
            transition: 'all 0.2s',
            fontFamily: '"Courier New", monospace',
          }}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = '0 0 30px rgba(68, 68, 255, 0.8)';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = '0 0 20px rgba(68, 68, 255, 0.5)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          Reset
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
