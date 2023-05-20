// import { useEffect, useRef } from "react";

// export default function AudioSpectrum() {
//     const audioRef = useRef(null);
//     const barElens = useRef([]);
//     const isAudioConnected = useRef(false); // Flag para controlar a conexão do elemento de áudio

//     useEffect(() => {
//         let audioContext;
//         let analyser;

//         const connectAudio = () => {
//             audioContext = new (window.AudioContext || window.webkitAudioContext)();
//             analyser = audioContext.createAnalyser();

//             const audioSource = audioContext.createMediaElementSource(audioRef.current);
//             audioSource.connect(analyser);
//             analyser.connect(audioContext.destination);

//             analyser.fftSize = 256;
//             const bufferLength = analyser.frequencyBinCount;
//             const dataArray = new Uint8Array(bufferLength);

//             const draw = () => {
//                 requestAnimationFrame(draw);

//                 analyser.getByteFrequencyData(dataArray);

//                 for (let i = 0; i < bufferLength; i++) {
//                     const barElen = barElens.current[i];
//                     if(barElen) {
//                          barElen.style.height = `${dataArray[i]}px`;
//                     }
//                 }
//             };

//             draw();
//         };

//         if (!isAudioConnected.current) {
//             connectAudio();
//             isAudioConnected.current = true;
//         }

//         return () => {
//             // Limpar recursos quando o componente é desmontado
//             audioContext.close();
//         };
//     }, []);


//     return (
//         <div className="bg-black">
//             <audio ref={audioRef} controls src="/file_example_MP3_700KB.mp3" autoPlay  />
//             <div className="flex justify-center items-end h-[200px]">
//                 {[...Array(256)].map((_, index) => (
//                     <div key={index} ref={el => barElens.current[index] = el} className="w-[10px] my-0 mx-1 bg-red-600"></div>
//                 ))}
//             </div>
//         </div>
//     );
// }


import React, { useEffect, useRef } from 'react';

const AudioSpectrum = () => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
   const isAudioConnected = useRef(false);

  useEffect(() => {
    const audioElement = audioRef.current;
    const canvasElement = canvasRef.current;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    var a = new Audio('/file_example_MP3_700KB.mp3');
    const source = audioContext.createMediaElementSource(a);
    a.play();

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvasContext = canvasElement.getContext('2d');
    const WIDTH = canvasElement.width;
    const HEIGHT = canvasElement.height;

    const draw = () => {
      requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      canvasContext.fillStyle = 'rgb(0, 0, 0)';
      canvasContext.fillRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;

        canvasContext.fillStyle = `rgb(${barHeight + 100},50,50)`;
        canvasContext.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      audioContext.close();
      source.disconnect();
    };
  }, []);

  return (
    <div>
      <audio ref={audioRef} src="/file_example_MP3_700KB.mp3" controls />
      <canvas ref={canvasRef} width="500" height="200" />
    </div>
  );
};

export default AudioSpectrum;