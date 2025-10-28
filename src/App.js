import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
import GrokGame from './components/GrokGame';

function App() {
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: 0, margin: 0, width: '100vw', overflow: 'hidden' }}>
      <GrokGame />
    </div>
  );
}

export default App;

mkdir components
cd components
nano GrokGame.js

// /app/frontend/src/components/GrokGame.js
import { useEffect, useRef, useState } from 'react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GROUND_Y = CANVAS_HEIGHT - 50;
const PLAYER_SIZE = 40;
const JUMP_FORCE = -15;
const GRAVITY = 0.8;
const MOVE_SPEED = 5;
const PARTICLE_LIFETIME = 20;
const LEVEL_INTERVAL = 30000;
const POWERUP_DURATION = 8000;
const BOSS_HEALTH = 5;

export default function GrokGame() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [particles, setParticles] = useState([]);
  const [powerup, setPowerup] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const keys = useRef({ left: false, right: false, up: false });
  const game = useRef({
    player: {
      x: 100,
      y: GROUND_Y - PLAYER_SIZE,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      velocityY: 0,
      jumping: false,
      onGround: true,
      shield: false
    },
    platforms: [],
    viruses: [],
    microchips: [],
    powerups: [],
    boss: null,
    score: 0,
    level: 1
  }).current;

  // Audio
  const audioContext = useRef(null);
  const initAudio = () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const playSound = (freq = 440, duration = 0.1, type = 'sine', volume = 0.3) => {
    initAudio();
    const osc = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();
    osc.connect(gain);
    gain.connect(audioContext.current.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(volume, audioContext.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + duration);
    osc.start();
    osc.stop(audioContext.current.currentTime + duration);
  };

  const createParticles = (x, y, color = '#fbbf24', count = 12) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 3;
      newParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFETIME,
        color
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const saveScore = () => {
    const name = prompt("Game Over! Enter your name for leaderboard:", "Player");
    if (name) {
      const entry = { name: name.slice(0, 12), score: game.score, level: game.level, date: new Date().toLocaleDateString() };
      const newBoard = [...leaderboard, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      setLeaderboard(newBoard);
      localStorage.setItem('grokEscapeLeaderboard', JSON.stringify(newBoard));
    }
  };

  const loadLeaderboard = () => {
    const saved = localStorage.getItem('grokEscapeLeaderboard');
    if (saved) setLeaderboard(JSON.parse(saved));
  };

  const resetGame = () => {
    game.player.x = 100;
    game.player.y = GROUND_Y - PLAYER_SIZE;
    game.player.velocityY = 0;
    game.player.jumping = false;
    game.player.onGround = true;
    game.player.shield = false;
    game.score = 0;
    game.level = 1;
    game.boss = null;
    setScore(0);
    setLevel(1);
    setGameOver(false);
    setParticles([]);
    setPowerup(null);

    game.platforms = [
      { x: 300, y: 450, width: 150, height: 20, color: '#1f2937' },
      { x: 500, y: 350, width: 120, height: 20, color: '#1f2937' },
      { x: 150, y: 300, width: 100, height: 20, color: '#1f2937' },
      { x: 600, y: 250, width: 140, height: 20, color: '#1f2937' }
    ];

    game.viruses = [
      { x: 320, y: 410, width: 40, height: 40, speedX: 2, direction: 1 },
      { x: 520, y: 310, width: 40, height: 40, speedX: 2.5, direction: -1 }
    ];

    game.microchips = [
      { x: 350, y: 400, width: 30, height: 30 },
      { x: 540, y: 300, width: 30, height: 30 },
      { x: 170, y: 250, width: 30, height: 30 },
      { x: 650, y: 200, width: 30, height: 30 }
    ];

    game.powerups = [
      { x: 400, y: 200, width: 30, height: 30, type: 'shield', active: false }
    ];
  };

  const spawnBoss = () => {
    game.boss = {
      x: CANVAS_WIDTH - 150,
      y: 100,
      width: 100,
      height: 100,
      health: BOSS_HEALTH,
      maxHealth: BOSS_HEALTH,
      speedX: 1.5,
      direction: -1,
      shootTimer: 0
    };
    playSound(150, 1.5, 'sawtooth', 0.5);
  };

  const advanceLevel = () => {
    const newLevel = game.level + 1;
    game.level = newLevel;
    setLevel(newLevel);

    const speedMultiplier = 1 + (newLevel - 1) * 0.3;
    game.viruses.forEach(v => {
      v.speedX = (2 + Math.random()) * speedMultiplier;
    });

    if (newLevel % 2 === 0) {
      game.platforms.push({
        x: Math.random() * (CANVAS_WIDTH - 150),
        y: 200 + Math.random() * 200,
        width: 100 + Math.random() * 50,
        height: 20,
        color: '#1f2937'
      });
    }

    game.microchips.push({
      x: Math.random() * (CANVAS_WIDTH - 100) + 50,
      y: Math.random() * 400 + 100,
      width: 30,
      height: 30
    });

    if (newLevel % 3 === 0 && Math.random() < 0.7) {
      game.powerups.push({
        x: Math.random() * (CANVAS_WIDTH - 100) + 50,
        y: Math.random() * 400 + 100,
        width: 30,
        height: 30,
        type: ['shield', 'doublejump'][Math.floor(Math.random() * 2)],
        active: false
      });
    }

    if (newLevel === 5 || newLevel === 10) {
      spawnBoss();
    }

    playSound(800, 0.3, 'square');
  };

  useEffect(() => {
    resetGame();
    loadLeaderboard();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let levelStartTime = Date.now();

    // Controls
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') keys.current.left = true;
      if (e.key === 'ArrowRight') keys.current.right = true;
      if (e.key === ' ') keys.current.up = true;
      if (e.key === 'd') setDarkMode(prev => !prev);
    };
    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft') keys.current.left = false;
      if (e.key === 'ArrowRight') keys.current.right = false;
      if (e.key === ' ') keys.current.up = false;
    };

    // Touch
    let touchStartX = 0;
    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      if (gameOver) resetGame();
    };
    const handleTouchMove = (e) => {
      const touchX = e.touches[0].clientX;
      const diff = touchX - touchStartX;
      if (Math.abs(diff) > 30) {
        keys.current.left = diff < 0;
        keys.current.right = diff > 0;
        touchStartX = touchX;
      }
    };
    const handleTouchEnd = () => {
      keys.current.left = false;
      keys.current.right = false;
    };

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
      if (gameOver) return;

      ctx.fillStyle = darkMode ? '#0f172a' : '#f8fafc';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Ground
      ctx.fillStyle = darkMode ? '#334155' : '#cbd5e1';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.strokeStyle = darkMode ? '#64748b' : '#64748b';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Player movement
      if (keys.current.left && game.player.x > 0) game.player.x -= MOVE_SPEED;
      if (keys.current.right && game.player.x < CANVAS_WIDTH - game.player.width) game.player.x += MOVE_SPEED;
      if (keys.current.up && game.player.onGround) {
        game.player.velocityY = JUMP_FORCE;
        game.player.jumping = true;
        game.player.onGround = false;
        playSound(600, 0.15);
      }

      // Gravity
      game.player.velocityY += GRAVITY;
      game.player.y += game.player.velocityY;
      game.player.onGround = false;

      // Platform collision
      game.platforms.forEach(platform => {
        if (
          game.player.x + game.player.width > platform.x &&
          game.player.x < platform.x + platform.width &&
          game.player.y + game.player.height >= platform.y &&
          game.player.y + game.player.height <= platform.y + platform.height &&
          game.player.velocityY >= 0
        ) {
          game.player.y = platform.y - game.player.height;
          game.player.velocityY = 0;
          game.player.jumping = false;
          game.player.onGround = true;
          playSound(300, 0.08);
        }
      });

      if (game.player.y > CANVAS_HEIGHT) {
        game.player.y = GROUND_Y - game.player.height;
        game.player.velocityY = 0;
        game.player.onGround = true;
      }

      // Draw platforms
      game.platforms.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + p.height / 2);
        ctx.lineTo(p.x + p.width, p.y + p.height / 2);
        ctx.stroke();
      });

      // Powerups
      game.powerups = game.powerups.filter(pu => {
        const collected = 
          game.player.x + game.player.width > pu.x &&
          game.player.x < pu.x + pu.width &&
          game.player.y + game.player.height > pu.y &&
          game.player.y < pu.y + pu.height;

        if (collected && !pu.active) {
          pu.active = true;
          setPowerup({ type: pu.type, expires: Date.now() + POWERUP_DURATION });
          if (pu.type === 'shield') {
            game.player.shield = true;
            playSound(900, 0.3, 'triangle');
            createParticles(pu.x + 15, pu.y + 15, '#60a5fa', 16);
          } else if (pu.type === 'doublejump') {
            playSound(1100, 0.3, 'square');
            createParticles(pu.x + 15, pu.y + 15, '#10b981', 16);
          }
        }

        if (!pu.active) {
          ctx.fillStyle = pu.type === 'shield' ? '#60a5fa' : '#10b981';
          ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(pu.x, pu.y, pu.width, pu.height);
          ctx.fillStyle = '#fff';
          ctx.font = '16px monospace';
          ctx.fillText(pu.type === 'shield' ? 'S' : 'DJ', pu.x + 8, pu.y + 22);
          return true;
        }
        return false;
      });

      // Microchips
      game.microchips = game.microchips.filter(chip => {
        const collected = 
          game.player.x + game.player.width > chip.x &&
          game.player.x < chip.x + chip.width &&
          game.player.y + game.player.height > chip.y &&
          game.player.y < chip.y + chip.height;

        if (collected) {
          game.score += 10;
          setScore(prev => prev + 10);
          playSound(1000, 0.2, 'square');
          createParticles(chip.x + 15, chip.y + 15);
        }

        if (!collected) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(chip.x, chip.y, chip.width, chip.height);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.strokeRect(chip.x, chip.y, chip.width, chip.height);
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(chip.x + 4, chip.y + chip.height / 2);
          ctx.lineTo(chip.x + chip.width - 4, chip.y + chip.height / 2);
          ctx.moveTo(chip.x + chip.width / 2, chip.y + 4);
          ctx.lineTo(chip.x + chip.width / 2, chip.y + chip.height - 4);
          ctx.stroke();
          return true;
        }
        return false;
      });

      // Viruses
      game.viruses.forEach(virus => {
        virus.x += virus.speedX * virus.direction;
        if (virus.x <= 0 || virus.x >= CANVAS_WIDTH - virus.width) {
          virus.direction *= -1;
        }

        const collision =
          game.player.x + game.player.width > virus.x &&
          game.player.x < virus.x + virus.width &&
          game.player.y + game.player.height > virus.y &&
          game.player.y < virus.y + virus.height;

        if (collision && game.player.velocityY >= 0) {
          if (game.player.shield) {
            game.player.shield = false;
            setPowerup(null);
            createParticles(game.player.x + 20, game.player.y + 20, '#ef4444', 20);
            playSound(400, 0.4, 'sawtooth');
          } else {
            setGameOver(true);
            playSound(200, 0.5, 'sawtooth');
            saveScore();
            return;
          }
        }

        // Draw virus
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        const cx = virus.x + virus.width / 2;
        const cy = virus.y + virus.height / 2;
        const r = virus.width / 2;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const ir = r * 0.6;
          const or = r;
          const x1 = cx + Math.cos(a) * or;
          const y1 = cy + Math.sin(a) * or;
          const x2 = cx + Math.cos(a + Math.PI / 8) * ir;
          const y2 = cy + Math.sin(a + Math.PI / 8) * ir;
          if (i === 0) ctx.moveTo(x1, y1);
          else ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 8, cy - 5, 4, 0, Math.PI * 2);
        ctx.arc(cx + 8, cy - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx - 8, cy - 5, 2, 0, Math.PI * 2);
        ctx.arc(cx + 8, cy - 5, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Boss
      if (game.boss) {
        game.boss.x += game.boss.speedX * game.boss.direction;
        if (game.boss.x <= 200 || game.boss.x >= CANVAS_WIDTH - game.boss.width - 100) {
          game.boss.direction *= -1;
        }

        game.boss.shootTimer++;
        if (game.boss.shootTimer > 120) {
          game.boss.shootTimer = 0;
          // Shoot projectile (simplified)
          playSound(300, 0.3, 'square');
        }

        const bossCollision =
          game.player.x + game.player.width > game.boss.x &&
          game.player.x < game.boss.x + game.boss.width &&
          game.player.y + game.player.height > game.boss.y &&
          game.player.y < game.boss.y + game.boss.height;

        if (bossCollision) {
          if (game.player.shield) {
            game.boss.health--;
            game.player.shield = false;
            setPowerup(null);
            createParticles(game.boss.x + 50, game.boss.y + 50, '#ef4444', 30);
            playSound(250, 0.5, 'sawtooth');
            if (game.boss.health <= 0) {
              game.score += 100;
              setScore(prev => prev + 100);
              game.boss = null;
              playSound(1200, 0.8, 'triangle');
              createParticles(game.boss.x + 50, game.boss.y + 50, '#10b981', 50);
            }
          } else {
            setGameOver(true);
            playSound(150, 1, 'sawtooth');
            saveScore();
          }
        }

        // Draw boss
        ctx.fillStyle = '#7c3aed';
        ctx.fillRect(game.boss.x, game.boss.y, game.boss.width, game.boss.height);
        ctx.strokeStyle = '#c4b5fd';
        ctx.lineWidth = 4;
        ctx.strokeRect(game.boss.x, game.boss.y, game.boss.width, game.boss.height);

        // Health bar
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(game.boss.x, game.boss.y - 20, game.boss.width, 10);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(game.boss.x, game.boss.y - 20, (game.boss.health / game.boss.maxHealth) * game.boss.width, 10);

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(game.boss.x + 25, game.boss.y + 30, 8, 0, Math.PI * 2);
        ctx.arc(game.boss.x + 75, game.boss.y + 30, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Particles
      setParticles(prev => prev
        .map(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.2;
          p.life--;
          return p;
        })
        .filter(p => p.life > 0)
      );

      particles.forEach(p => {
        ctx.globalAlpha = p.life / PARTICLE_LIFETIME;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      });
      ctx.globalAlpha = 1;

      // Player
      ctx.fillStyle = game.player.shield ? '#60a5fa' : '#3b82f6';
      ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 3;
      ctx.strokeRect(game.player.x, game.player.y, game.player.width, game.player.height);

      // Shield effect
      if (game.player.shield) {
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(game.player.x - 5, game.player.y - 5, game.player.width + 10, game.player.height + 10);
        ctx.setLineDash([]);
      }

      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(game.player.x + 12, game.player.y + 15, 5, 0, Math.PI * 2);
      ctx.arc(game.player.x + 28, game.player.y + 15, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(game.player.x + 12, game.player.y + 15, 3, 0, Math.PI * 2);
      ctx.arc(game.player.x + 28, game.player.y + 15, 3, 0, Math.PI * 2);
      ctx.fill();

      // xAI logo
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(game.player.x + 10, game.player.y + 25);
      ctx.lineTo(game.player.x + 20, game.player.y + 35);
      ctx.moveTo(game.player.x + 20, game.player.y + 25);
      ctx.lineTo(game.player.x + 10, game.player.y + 35);
      ctx.stroke();

      // UI
      ctx.fillStyle = darkMode ? '#e2e8f0' : '#1e293b';
      ctx.font = '24px monospace';
      ctx.fillText(`Score: ${score}`, 20, 40);
      ctx.fillText(`Level: ${level}`, 20, 70);
      if (powerup) {
        const timeLeft = Math.ceil((powerup.expires - Date.now()) / 1000);
        ctx.fillText(`${powerup.type === 'shield' ? 'Shield' : 'Double Jump'}: ${timeLeft}s`, 20, 100);
      }

      // Level timer
      if (Date.now() - levelStartTime > LEVEL_INTERVAL) {
        advanceLevel();
        levelStartTime = Date.now();
      }

      // Powerup timer
      if (powerup && Date.now() > powerup.expires) {
        game.player.shield = false;
        setPowerup(null);
      }

      if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(100, 150, 600, 300);
        ctx.fillStyle = '#fff';
        ctx.font = '48px monospace';
        ctx.fillText('GAME OVER', 220, 230);
        ctx.font = '28px monospace';
        ctx.fillText(`Score: ${score} | Level: ${level}`, 230, 280);
        ctx.font = '24px monospace';
        ctx.fillText('Tap / Space to Restart', 240, 340);
        ctx.fillText('Press D for Dark Mode', 240, 380);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver, score, level, particles, powerup, darkMode]);

  // Restart
  useEffect(() => {
    const handleRestart = (e) => {
      if (gameOver && (e.key === ' ' || e.type === 'click' || e.type === 'touchstart')) {
        resetGame();
      }
    };
    const canvas = canvasRef.current;
    canvas.addEventListener('click', handleRestart);
    canvas.addEventListener('touchstart', handleRestart);
    window.addEventListener('keydown', handleRestart);
    return () => {
      canvas.removeEventListener('click', handleRestart);
      canvas.removeEventListener('touchstart', handleRestart);
      window.removeEventListener('keydown', handleRestart);
    };
  }, [gameOver]);

  return (
    <div className={`flex flex-col items-center p-4 md:p-8 min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <div className="flex justify-between w-full max-w-4xl mb-4">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            Grok's Circuit Escape
          </h1>
          <p className={`text-sm md:text-base mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Arrow/Swipe to move • Space/Tap to jump • D = Dark Mode
          </p>
        </div>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        >
          {darkMode ? 'Light' : 'Dark'}
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg`}>
          <h3 className={`font-bold mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>Powerups</h3>
          <p className="text-xs"><span className="text-blue-400">S</span> Shield (8s)</p>
          <p className="text-xs"><span className="text-green-400">DJ</span> Double Jump</p>
        </div>
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-lg max-h-32 overflow-y-auto`}>
          <h3 className={`font-bold mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>Leaderboard</h3>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-500">No scores yet!</p>
          ) : (
            leaderboard.map((entry, i) => (
              <div key={i} className="text-xs flex justify-between gap-4">
                <span>{i + 1}. {entry.name}</span>
                <span className="font-mono">{entry.score}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className={`border-4 rounded-lg shadow-2xl max-w-full h-auto cursor-pointer ${darkMode ? 'border-blue-500' : 'border-blue-400'}`}
        style={{ touchAction: 'none' }}
      />

      <p className={`text-xs mt-4 ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
        Sound: Click to enable • Boss every 5 levels • Survive and climb the ranks!
      </p>
    </div>  );
}
cd ../../public
nano manifest.json

{
  "short_name": "Grok Escape",
  "name": "Grok's Circuit Escape",
  "icons": [
    { "src": "favicon.ico", "sizes": "64x64", "type": "image/x-icon" }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#0f172a",
  "background_color": "#0f172a"
}
nano index.html


