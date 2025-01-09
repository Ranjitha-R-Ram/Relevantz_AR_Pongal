import React, { useState, useCallback, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import "./WebcamStyles.css";

const WebcamComponent = () => {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isARMode, setIsARMode] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelVisible, setModelVisible] = useState(false);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const sceneRef = useRef(null);

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    setError(null);
  };

  const flipCamera = useCallback(() => {
    setFacingMode((prevMode) => (prevMode === "user" ? "environment" : "user"));
  }, []);

  const videoConstraints = {
    facingMode: facingMode,
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  const setupARVideo = async (stream) => {
    if (!videoRef.current) return;

    try {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      console.log("AR Video playback started successfully");
    } catch (err) {
      console.error("AR Video playback failed:", err);
      setError("Failed to start AR video playback");
    }
  };

  const initializeAR = async () => {
    try {
      if (typeof window.AFRAME === "undefined") {
        throw new Error("A-Frame not loaded");
      }

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await setupARVideo(stream);

      // Wait for video metadata to load
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = resolve;
        }
      });

      setModelLoaded(false); // Reset model loaded state

      // Request fullscreen for AR container
      if (sceneRef.current) {
        if (sceneRef.current.requestFullscreen) {
          await sceneRef.current.requestFullscreen();
        } else if (sceneRef.current.mozRequestFullScreen) {
          await sceneRef.current.mozRequestFullScreen();
        } else if (sceneRef.current.webkitRequestFullscreen) {
          await sceneRef.current.webkitRequestFullscreen();
        } else if (sceneRef.current.msRequestFullscreen) {
          await sceneRef.current.msRequestFullscreen();
        }
      }
    } catch (err) {
      console.error("AR initialization failed:", err);
      setError("Failed to initialize AR mode");
      setIsARMode(false);
    }
  };

  useEffect(() => {
    if (isARMode) {
      const handleModelLoaded = () => {
        console.log("3D model loaded successfully");
        setModelLoaded(true);
        setModelVisible(true); // Make the model visible when successfully loaded
      };

      const handleModelError = (error) => {
        console.error("3D model failed to load:", error);
        setError("Failed to load 3D model. See console for details.");
      };

      const modelEntity = document.querySelector("[gltf-model]");
      if (modelEntity) {
        modelEntity.addEventListener("model-loaded", handleModelLoaded);
        modelEntity.addEventListener("model-error", handleModelError);
      }

      return () => {
        if (modelEntity) {
          modelEntity.removeEventListener("model-loaded", handleModelLoaded);
          modelEntity.removeEventListener("model-error", handleModelError);
        }
      };
    }
  }, [isARMode]);

  useEffect(() => {
    let interval;

    if (isCameraOn && webcamRef.current && !error && !isARMode) {
      const sendFrames = async () => {
        if (!webcamRef.current?.video || !canvasRef.current || isUploading)
          return;

        try {
          setIsUploading(true);
          const canvas = canvasRef.current;
          const video = webcamRef.current.video;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const frame = canvas.toDataURL("image/jpeg");

          const response = await fetch(
            "http://192.168.8.90:8010/process_frame",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ frame }),
            }
          );

          const data = await response.json();

          if (response.status === 200) {
            console.log("Frame processed successfully");
            setIsARMode(true);
            await initializeAR();
          } else {
            throw new Error(data.message || "Unknown error");
          }
        } catch (err) {
          console.error("Error sending frame:", err);
        } finally {
          setIsUploading(false);
        }
      };

      interval = setInterval(sendFrames, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isCameraOn, error, isUploading, isARMode]);

  return (
    <div className="webcam-container">
      <div className="webcam-card">
        <div className="gradient-bar" />
        <h1 className="title">📸 {isARMode ? "AR Mode" : "Camera Access"}</h1>

        <div className="webcam-wrapper">
          {isARMode && (
            <div className="ar-container">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="ar-video"
              />

              <a-scene
                ref={sceneRef}
                embedded
                vr-mode-ui="enabled: false"
                renderer="logarithmicDepthBuffer: true; antialias: true; alpha: true"
                className="ar-scene">
                <a-assets>
                  <a-asset-item
                    id="pongal-model"
                    src={`${process.env.PUBLIC_URL}/model/whole_setup.glb`}></a-asset-item>
                </a-assets>

                <a-box position="0 1 -3" material="color: red;"></a-box>

                {modelVisible && ( // Control visibility based on loading
                  <a-entity
                    position="0 1 -3" // Adjust position further back
                    scale="0.01 0.01 0.01" // Scale down for visibility
                    gltf-model="#pongal-model" // Your model reference
                    animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"
                  />
                )}

                <a-entity
                  camera
                  look-controls
                  wasd-controls
                  position="0 1.6 0"></a-entity>
                <a-light type="ambient" intensity="1"></a-light>
                <a-light
                  type="directional"
                  position="1 1 1"
                  intensity="0.5"></a-light>
              </a-scene>

              <div className="ar-overlay">
                <p className="text-center p-4 bg-black bg-opacity-50 text-white rounded">
                  {error
                    ? `Error: ${error}`
                    : !modelLoaded
                    ? "Loading 3D model..."
                    : "3D model loaded! Move your device to explore."}
                </p>
              </div>
            </div>
          )}

          {!isARMode && isCameraOn && (
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={videoConstraints}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "0.5rem",
              }}
            />
          )}

          {!isCameraOn && (
            <div className="webcam-placeholder">
              <p className="text-gray-500">Camera is currently off</p>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="button-container">
          {!isARMode && (
            <>
              <button
                onClick={toggleCamera}
                className={`control-button ${
                  isCameraOn ? "stop-button" : "start-button"
                }`}
                disabled={isUploading}>
                {isCameraOn ? "Stop Camera" : "Start Camera"}
              </button>

              {isCameraOn && (
                <button
                  onClick={flipCamera}
                  className="control-button flip-button"
                  disabled={isUploading}>
                  Flip Camera
                </button>
              )}
            </>
          )}
        </div>

        <p className="helper-text">
          {isARMode
            ? "AR Mode Active - Move your device to view the 3D model"
            : isCameraOn
            ? `Camera facing: ${facingMode === "user" ? "Front" : "Back"}`
            : "Click Start Camera to begin"}
        </p>
      </div>
    </div>
  );
};

export default WebcamComponent;
