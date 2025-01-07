import React, { useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import './WebcamStyles.css';

const WebcamComponent = () => {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const webcamRef = React.useRef(null);

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  const flipCamera = useCallback(() => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  }, []);

  const videoConstraints = {
    facingMode: facingMode,
    width: { ideal: 1280 },
    height: { ideal: 720 }
  };

  return (
    <div className="webcam-container">
      <div className="webcam-card">
        <div className="gradient-bar" />
        <h1 className="title">
          📸 Camera Access
        </h1>
        
        <div className="webcam-wrapper">
          {isCameraOn ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={videoConstraints}
              style={{ width: '100%', borderRadius: '0.5rem' }}
            />
          ) : (
            <div style={{ 
              width: '320px', 
              height: '240px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: '#f8f9fa',
              borderRadius: '0.5rem'
            }}>
              <p className="text-gray-500">Camera is currently off</p>
            </div>
          )}
        </div>

        <div className="button-container">
          <button
            onClick={toggleCamera}
            className={`control-button ${isCameraOn ? 'stop-button' : 'start-button'}`}
          >
            {isCameraOn ? 'Stop Camera' : 'Start Camera'}
          </button>
          
          {isCameraOn && (
            <button
              onClick={flipCamera}
              className="control-button flip-button"
            >
              Flip Camera
            </button>
          )}
        </div>

        <p className="helper-text">
          {isCameraOn 
            ? `Camera facing: ${facingMode === 'user' ? 'Front' : 'Back'}`
            : 'Click Start Camera to begin'}
        </p>
      </div>
    </div>
  );
};

export default WebcamComponent;