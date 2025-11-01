"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import Joystick, { JumpButton } from "@/components/Joystick"

interface Platform {
  x: number
  y: number
  w: number
  h: number
}

interface FloorSegment {
  x: number
  w: number
}

interface Enemy {
  x: number
  y: number
  w: number
  h: number
  vx: number
  alive: boolean
  animFrame: number
}

interface Coin {
  x: number
  y: number
  w: number
  h: number
  collected: boolean
  animFrame: number
}

interface Wormhole {
  x: number
  y: number
  w: number
  h: number
  animFrame: number
}

interface GameState {
  level: number
  score: number
  lives: number
  gameOver: boolean
  levelComplete: boolean
  transitioning: boolean
}

type GameScreen = "menu" | "howToPlay" | "playing" | "gameOver"

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const joyRef = useRef({ x: 0, y: 0 })
  const jumpRef = useRef(false)

  const [gameScreen, setGameScreen] = useState<GameScreen>("menu")
  const [isLandscape, setIsLandscape] = useState(true)

  const camera = useRef({ x: 0, y: 0 })

  const player = useRef({
    x: 100,
    y: 200,
    vx: 0,
    vy: 0,
    w: 40,
    h: 60,
    grounded: false,
    facingRight: true,
    walkFrame: 0,
    walkTimer: 0,
    invincible: false,
    invincibleTimer: 0,
  })

  const gameState = useRef<GameState>({
    level: 1,
    score: 0,
    lives: 3,
    gameOver: false,
    levelComplete: false,
    transitioning: false,
  })

  const platforms = useRef<Platform[]>([])
  const floorSegments = useRef<FloorSegment[]>([])
  const enemies = useRef<Enemy[]>([])
  const coins = useRef<Coin[]>([])
  const wormhole = useRef<Wormhole | null>(null)
  const levelWidth = useRef(3000)

  const audioContext = useRef<AudioContext | null>(null)
  const musicGain = useRef<GainNode | null>(null)
  const sfxGain = useRef<GainNode | null>(null)

  const initAudio = useCallback(() => {
    if (audioContext.current) return

    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    musicGain.current = audioContext.current.createGain()
    sfxGain.current = audioContext.current.createGain()

    musicGain.current.connect(audioContext.current.destination)
    sfxGain.current.connect(audioContext.current.destination)

    musicGain.current.gain.value = 0.3
    sfxGain.current.gain.value = 0.5

    playBackgroundMusic()
  }, [])

  const playBackgroundMusic = useCallback(() => {
    if (!audioContext.current || !musicGain.current) return

    const ctx = audioContext.current

    const createChillTranceLoop = () => {
      const bass = ctx.createOscillator()
      const bassGain = ctx.createGain()
      bass.type = "sine"
      bass.frequency.value = 55
      bassGain.gain.value = 0.15
      bass.connect(bassGain)
      bassGain.connect(musicGain.current!)
      bass.start()

      const pad = ctx.createOscillator()
      const padGain = ctx.createGain()
      const padFilter = ctx.createBiquadFilter()
      pad.type = "sawtooth"
      padFilter.type = "lowpass"
      padFilter.frequency.value = 800
      padGain.gain.value = 0.08
      pad.connect(padFilter)
      padFilter.connect(padGain)
      padGain.connect(musicGain.current!)
      pad.start()

      const lead = ctx.createOscillator()
      const leadGain = ctx.createGain()
      const leadFilter = ctx.createBiquadFilter()
      lead.type = "triangle"
      leadFilter.type = "lowpass"
      leadFilter.frequency.value = 1200
      leadGain.gain.value = 0.12
      lead.connect(leadFilter)
      leadFilter.connect(leadGain)
      leadGain.connect(musicGain.current!)
      lead.start()

      const chordProgression = [
        [220, 262, 330],
        [175, 220, 262],
        [262, 330, 392],
        [196, 247, 294],
      ]

      const melodyNotes = [440, 495, 523, 587, 659, 523, 495, 440]

      let chordIndex = 0
      let melodyIndex = 0

      const changeChord = () => {
        const chord = chordProgression[chordIndex]
        bass.frequency.setValueAtTime(chord[0] / 2, ctx.currentTime)
        pad.frequency.setValueAtTime(chord[1], ctx.currentTime)
        chordIndex = (chordIndex + 1) % chordProgression.length
      }

      const changeMelody = () => {
        lead.frequency.setValueAtTime(melodyNotes[melodyIndex], ctx.currentTime)
        leadFilter.frequency.setValueAtTime(1200 + Math.sin(melodyIndex) * 400, ctx.currentTime)
        melodyIndex = (melodyIndex + 1) % melodyNotes.length
      }

      changeChord()
      changeMelody()

      setInterval(changeChord, 2000)
      setInterval(changeMelody, 500)
    }

    createChillTranceLoop()
  }, [])

  const playSoundEffect = useCallback((type: "jump" | "coin" | "hit" | "wormhole") => {
    if (!audioContext.current || !sfxGain.current) return

    const ctx = audioContext.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(sfxGain.current)

    switch (type) {
      case "jump":
        osc.frequency.value = 400
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
        break
      case "coin":
        osc.frequency.value = 800
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05)
        gain.gain.setValueAtTime(0.4, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
        break
      case "hit":
        osc.type = "sawtooth"
        osc.frequency.value = 200
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2)
        gain.gain.setValueAtTime(0.5, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
        break
      case "wormhole":
        osc.type = "sine"
        osc.frequency.value = 400
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.4, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
        break
    }
  }, [])

  const generateLevel = useCallback((level: number) => {
    const canvasHeight = containerRef.current?.clientHeight || 600
    const groundY = canvasHeight - 100

    // Level gets longer and harder
    levelWidth.current = 3000 + level * 1000

    platforms.current = []
    floorSegments.current = []
    enemies.current = []
    coins.current = []

    // Generate floor with gaps
    let currentX = 0
    while (currentX < levelWidth.current) {
      const segmentWidth = 200 + Math.random() * 300
      const hasGap = Math.random() > 0.3 && currentX > 100 // 70% chance of gap after start

      if (!hasGap || currentX < 100) {
        floorSegments.current.push({ x: currentX, w: segmentWidth })
      } else {
        // Create a gap (no floor segment)
        const gapWidth = 80 + Math.random() * 120 + level * 10
        currentX += gapWidth

        // Add platform over gap sometimes
        if (Math.random() > 0.5) {
          platforms.current.push({
            x: currentX - gapWidth / 2 - 50,
            y: groundY - 80 - Math.random() * 60,
            w: 100,
            h: 20,
          })
        }
      }

      currentX += segmentWidth
    }

    // Generate Mario-style platform formations
    let platformX = 300
    while (platformX < levelWidth.current - 500) {
      const formationType = Math.random()

      if (formationType < 0.3) {
        // Staircase formation
        for (let i = 0; i < 4; i++) {
          platforms.current.push({
            x: platformX + i * 80,
            y: groundY - 60 - i * 50,
            w: 80,
            h: 20,
          })
        }
        platformX += 400
      } else if (formationType < 0.6) {
        // Floating platform row
        const height = groundY - 150 - Math.random() * 100
        for (let i = 0; i < 3; i++) {
          platforms.current.push({
            x: platformX + i * 120,
            y: height,
            w: 80,
            h: 20,
          })
        }
        platformX += 450
      } else {
        // Single high platform
        platforms.current.push({
          x: platformX,
          y: groundY - 180 - Math.random() * 80,
          w: 120,
          h: 20,
        })
        platformX += 250
      }
    }

    // Place microchips strategically
    const coinCount = 15 + level * 5

    // Coins on platforms
    for (let i = 0; i < coinCount / 2; i++) {
      const platform = platforms.current[Math.floor(Math.random() * platforms.current.length)]
      if (platform) {
        coins.current.push({
          x: platform.x + platform.w / 2,
          y: platform.y - 40,
          w: 25,
          h: 25,
          collected: false,
          animFrame: 0,
        })
      }
    }

    // Coins in the air
    for (let i = 0; i < coinCount / 2; i++) {
      coins.current.push({
        x: 200 + Math.random() * (levelWidth.current - 400),
        y: groundY - 100 - Math.random() * 150,
        w: 25,
        h: 25,
        collected: false,
        animFrame: 0,
      })
    }

    // Generate enemies on floor and platforms
    const enemyCount = 3 + level * 2
    for (let i = 0; i < enemyCount; i++) {
      if (Math.random() > 0.5 && platforms.current.length > 0) {
        // Enemy on platform
        const platform = platforms.current[Math.floor(Math.random() * platforms.current.length)]
        enemies.current.push({
          x: platform.x + platform.w / 2,
          y: platform.y - 40,
          w: 35,
          h: 35,
          vx: 60 + level * 15,
          alive: true,
          animFrame: 0,
        })
      } else {
        // Enemy on floor
        const segment = floorSegments.current[Math.floor(Math.random() * floorSegments.current.length)]
        if (segment) {
          enemies.current.push({
            x: segment.x + Math.random() * segment.w,
            y: groundY - 40,
            w: 35,
            h: 35,
            vx: 60 + level * 15,
            alive: true,
            animFrame: 0,
          })
        }
      }
    }

    // Create wormhole at the end
    wormhole.current = {
      x: levelWidth.current - 200,
      y: groundY - 100,
      w: 60,
      h: 80,
      animFrame: 0,
    }

    // Reset player position
    player.current.x = 100
    player.current.y = groundY - 100
    player.current.vx = 0
    player.current.vy = 0
    player.current.grounded = false
    camera.current.x = 0
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      generateLevel(1)
    }
  }, [generateLevel])

  useEffect(() => {
    const checkOrientation = () => {
      const isLandscapeMode = window.innerWidth > window.innerHeight
      setIsLandscape(isLandscapeMode)
    }

    checkOrientation()
    window.addEventListener("resize", checkOrientation)
    window.addEventListener("orientationchange", checkOrientation)

    return () => {
      window.removeEventListener("resize", checkOrientation)
      window.removeEventListener("orientationchange", checkOrientation)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && "screen" in window && "orientation" in window.screen) {
      const screenOrientation = window.screen.orientation as any
      if (screenOrientation && "lock" in screenOrientation) {
        screenOrientation.lock("landscape").catch(() => {})
      }
    }
  }, [])

  const requestJump = useCallback(() => {
    initAudio()
    if (player.current.grounded && !gameState.current.gameOver) {
      jumpRef.current = true
      playSoundEffect("jump")
      setTimeout(() => {
        jumpRef.current = false
      }, 100)
    }
  }, [initAudio, playSoundEffect])

  const startGame = useCallback(() => {
    initAudio()
    gameState.current = {
      level: 1,
      score: 0,
      lives: 3,
      gameOver: false,
      levelComplete: false,
      transitioning: false,
    }
    generateLevel(1)
    setGameScreen("playing")
  }, [initAudio, generateLevel])

  const retryGame = useCallback(() => {
    startGame()
  }, [startGame])

  const quitToMenu = useCallback(() => {
    setGameScreen("menu")
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || gameScreen !== "playing") return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const grokImg = new Image()
    grokImg.crossOrigin = "anonymous"
    grokImg.src = "/grok-cute.png"

    const resize = () => {
      const parent = containerRef.current
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = w + "px"
      canvas.style.height = h + "px"
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener("resize", resize)

    const gravity = 1200
    const maxSpeed = 300
    const acceleration = 20
    let last = performance.now()
    let raf: number
    let animTimer = 0

    function drawCharacter(
      ctx: CanvasRenderingContext2D,
      p: typeof player.current,
      animTimer: number,
      grokImg: HTMLImageElement,
    ) {
      const drawX = p.x
      const drawY = p.y

      ctx.save()
      ctx.translate(drawX, drawY)
      if (!p.facingRight) {
        ctx.scale(-1, 1)
      }

      if (p.invincible && Math.floor(animTimer * 10) % 2 === 0) {
        ctx.globalAlpha = 0.5
      }

      const isMoving = Math.abs(p.vx) > 10
      const walkCycle = Math.sin(p.walkFrame * Math.PI)
      const bounceOffset = p.grounded && isMoving ? Math.abs(Math.sin(p.walkFrame * Math.PI)) * 3 : 0

      const leftArmAngle = isMoving && p.grounded ? walkCycle * 0.4 : 0
      const rightArmAngle = isMoving && p.grounded ? -walkCycle * 0.4 : 0
      const leftLegAngle = isMoving && p.grounded ? walkCycle * 0.5 : 0
      const rightLegAngle = isMoving && p.grounded ? -walkCycle * 0.5 : 0

      const jumpArmAngle = !p.grounded ? -0.6 : 0
      const jumpLegAngle = !p.grounded ? 0.2 : 0
      const jumpLegSpread = !p.grounded ? 4 : 0

      // Left leg
      ctx.save()
      ctx.translate(-8 - jumpLegSpread, p.h / 2 - 25 + bounceOffset)
      ctx.rotate(leftLegAngle + jumpLegAngle)
      ctx.fillStyle = "#4ECDC4"
      ctx.strokeStyle = "#2A9D8F"
      ctx.lineWidth = 2.5

      // Upper leg (thigh)
      ctx.beginPath()
      ctx.roundRect(-6, 0, 12, 20, 3)
      ctx.fill()
      ctx.stroke()

      // Knee joint
      ctx.fillStyle = "#3AAAA0"
      ctx.beginPath()
      ctx.arc(0, 20, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Lower leg with knee bend
      ctx.save()
      ctx.translate(0, 20)
      ctx.rotate(isMoving && p.grounded ? walkCycle * 0.2 : 0)
      ctx.fillStyle = "#4ECDC4"
      ctx.beginPath()
      ctx.roundRect(-5, 0, 10, 18, 3)
      ctx.fill()
      ctx.stroke()

      // Foot
      ctx.fillStyle = "#2A9D8F"
      ctx.beginPath()
      ctx.ellipse(0, 18, 8, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      ctx.restore()

      // Right leg
      ctx.save()
      ctx.translate(8 + jumpLegSpread, p.h / 2 - 25 + bounceOffset)
      ctx.rotate(rightLegAngle + jumpLegAngle)
      ctx.fillStyle = "#4ECDC4"
      ctx.strokeStyle = "#2A9D8F"
      ctx.lineWidth = 2.5

      // Upper leg (thigh)
      ctx.beginPath()
      ctx.roundRect(-6, 0, 12, 20, 3)
      ctx.fill()
      ctx.stroke()

      // Knee joint
      ctx.fillStyle = "#3AAAA0"
      ctx.beginPath()
      ctx.arc(0, 20, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Lower leg with knee bend
      ctx.save()
      ctx.translate(0, 20)
      ctx.rotate(isMoving && p.grounded ? -walkCycle * 0.2 : 0)
      ctx.fillStyle = "#4ECDC4"
      ctx.beginPath()
      ctx.roundRect(-5, 0, 10, 18, 3)
      ctx.fill()
      ctx.stroke()

      // Foot
      ctx.fillStyle = "#2A9D8F"
      ctx.beginPath()
      ctx.ellipse(0, 18, 8, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      ctx.restore()

      if (grokImg.complete && grokImg.naturalWidth) {
        ctx.drawImage(grokImg, -p.w / 2, -p.h / 2 + bounceOffset, p.w, p.h)
      } else {
        // Fallback body rendering
        ctx.fillStyle = "#4ECDC4"
        ctx.strokeStyle = "#2A9D8F"
        ctx.lineWidth = 3

        // Head
        ctx.beginPath()
        ctx.arc(0, bounceOffset - 12, p.w / 2 - 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Body
        ctx.fillRect(-p.w / 2 + 8, bounceOffset + 3, p.w - 16, p.h / 2 - 8)
        ctx.strokeRect(-p.w / 2 + 8, bounceOffset + 3, p.w - 16, p.h / 2 - 8)
      }

      // Left arm
      ctx.save()
      ctx.translate(-p.w / 2 + 8, bounceOffset - 5)
      ctx.rotate(leftArmAngle + jumpArmAngle)
      ctx.fillStyle = "#4ECDC4"
      ctx.strokeStyle = "#2A9D8F"
      ctx.lineWidth = 2.5

      // Upper arm
      ctx.beginPath()
      ctx.roundRect(-5, 0, 10, 18, 3)
      ctx.fill()
      ctx.stroke()

      // Elbow joint
      ctx.fillStyle = "#3AAAA0"
      ctx.beginPath()
      ctx.arc(0, 18, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Forearm with elbow bend
      ctx.save()
      ctx.translate(0, 18)
      ctx.rotate(isMoving && p.grounded ? walkCycle * 0.15 : 0)
      ctx.fillStyle = "#4ECDC4"
      ctx.beginPath()
      ctx.roundRect(-4, 0, 8, 15, 3)
      ctx.fill()
      ctx.stroke()

      // Hand
      ctx.fillStyle = "#4ECDC4"
      ctx.strokeStyle = "#2A9D8F"
      ctx.beginPath()
      ctx.arc(0, 15, 5.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      ctx.restore()

      // Right arm
      ctx.save()
      ctx.translate(p.w / 2 - 8, bounceOffset - 5)
      ctx.rotate(rightArmAngle + jumpArmAngle)
      ctx.fillStyle = "#4ECDC4"
      ctx.strokeStyle = "#2A9D8F"
      ctx.lineWidth = 2.5

      // Upper arm
      ctx.beginPath()
      ctx.roundRect(-5, 0, 10, 18, 3)
      ctx.fill()
      ctx.stroke()

      // Elbow joint
      ctx.fillStyle = "#3AAAA0"
      ctx.beginPath()
      ctx.arc(0, 18, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Forearm with elbow bend
      ctx.save()
      ctx.translate(0, 18)
      ctx.rotate(isMoving && p.grounded ? -walkCycle * 0.15 : 0)
      ctx.fillStyle = "#4ECDC4"
      ctx.beginPath()
      ctx.roundRect(-4, 0, 8, 15, 3)
      ctx.fill()
      ctx.stroke()

      // Hand
      ctx.fillStyle = "#4ECDC4"
      ctx.strokeStyle = "#2A9D8F"
      ctx.beginPath()
      ctx.arc(0, 15, 5.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      ctx.restore()

      ctx.restore()
    }

    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      animTimer += dt

      const p = player.current
      const gs = gameState.current
      const dpr = window.devicePixelRatio || 1
      const canvasW = canvas.width / dpr
      const canvasH = canvas.height / dpr
      const groundY = canvasH - 100

      if (gs.gameOver || gs.transitioning) {
        // Still render but don't update physics
      } else {
        const inputX = joyRef.current.x

        if (Math.abs(inputX) > 0.1) {
          const targetVx = inputX * maxSpeed
          p.vx += (targetVx - p.vx) * acceleration * dt
          p.facingRight = inputX > 0

          p.walkTimer += dt
          if (p.walkTimer > 0.12) {
            p.walkFrame = (p.walkFrame + 1) % 8
            p.walkTimer = 0
          }
        } else {
          p.vx *= Math.pow(0.01, dt)
          if (Math.abs(p.vx) < 1) p.vx = 0
          p.walkFrame = 0
        }

        if (jumpRef.current && p.grounded) {
          p.vy = -550
          p.grounded = false
          jumpRef.current = false
        }

        p.vy += gravity * dt
        p.x += p.vx * dt
        p.y += p.vy * dt

        p.grounded = false
        for (const segment of floorSegments.current) {
          if (
            p.x > segment.x &&
            p.x < segment.x + segment.w &&
            p.y + p.h / 2 > groundY &&
            p.y + p.h / 2 < groundY + 30 &&
            p.vy > 0
          ) {
            p.y = groundY - p.h / 2
            p.vy = 0
            p.grounded = true
            break
          }
        }

        // Platform collision
        for (const plat of platforms.current) {
          if (
            p.x + p.w / 2 > plat.x &&
            p.x - p.w / 2 < plat.x + plat.w &&
            p.y + p.h / 2 > plat.y &&
            p.y + p.h / 2 < plat.y + plat.h + 10 &&
            p.vy > 0
          ) {
            p.y = plat.y - p.h / 2
            p.vy = 0
            p.grounded = true
          }
        }

        // Enemy AI and collision
        for (const enemy of enemies.current) {
          if (!enemy.alive) continue

          enemy.x += enemy.vx * dt
          enemy.animFrame = (enemy.animFrame + dt * 10) % 4

          // Enemy bounds
          if (enemy.x < 0 || enemy.x > levelWidth.current) {
            enemy.vx *= -1
          }

          // Player-enemy collision
          if (
            !p.invincible &&
            Math.abs(p.x - enemy.x) < (p.w + enemy.w) / 2 &&
            Math.abs(p.y - enemy.y) < (p.h + enemy.h) / 2
          ) {
            if (p.vy > 0 && p.y < enemy.y) {
              enemy.alive = false
              p.vy = -300
              gs.score += 50
              playSoundEffect("hit")
            } else {
              gs.lives -= 1
              p.invincible = true
              p.invincibleTimer = 2
              playSoundEffect("hit")

              if (gs.lives <= 0) {
                gs.gameOver = true
              }
            }
          }
        }

        if (p.invincible) {
          p.invincibleTimer -= dt
          if (p.invincibleTimer <= 0) {
            p.invincible = false
          }
        }

        // Coin collection
        for (const coin of coins.current) {
          if (coin.collected) continue

          coin.animFrame = (coin.animFrame + dt * 8) % 4

          if (Math.abs(p.x - coin.x) < (p.w + coin.w) / 2 && Math.abs(p.y - coin.y) < (p.h + coin.h) / 2) {
            coin.collected = true
            gs.score += 10
            playSoundEffect("coin")
          }
        }

        // Wormhole collision
        if (wormhole.current) {
          wormhole.current.animFrame = (wormhole.current.animFrame + dt * 5) % 8

          if (
            Math.abs(p.x - wormhole.current.x) < (p.w + wormhole.current.w) / 2 &&
            Math.abs(p.y - wormhole.current.y) < (p.h + wormhole.current.h) / 2
          ) {
            gs.levelComplete = true
            gs.transitioning = true
            playSoundEffect("wormhole")

            setTimeout(() => {
              gs.level += 1
              gs.levelComplete = false
              gs.transitioning = false
              generateLevel(gs.level)
            }, 1500)
          }
        }

        // Fall off screen
        if (p.y > canvasH + 100) {
          gs.lives -= 1
          if (gs.lives <= 0) {
            gs.gameOver = true
          } else {
            p.x = 100
            p.y = groundY - 100
            p.vx = 0
            p.vy = 0
            camera.current.x = 0
          }
        }

        const targetCameraX = p.x - canvasW / 3
        camera.current.x += (targetCameraX - camera.current.x) * 5 * dt
        camera.current.x = Math.max(0, Math.min(camera.current.x, levelWidth.current - canvasW))
      }

      ctx.save()
      ctx.translate(-camera.current.x, 0)

      ctx.fillStyle = "#0a1a1a"
      ctx.fillRect(camera.current.x, 0, canvasW, canvasH)

      // Circuit traces (background)
      ctx.strokeStyle = "#1a3a2a"
      ctx.lineWidth = 2
      for (let i = 0; i < levelWidth.current / 50; i++) {
        ctx.beginPath()
        ctx.moveTo(i * 50, 0)
        ctx.lineTo(i * 50 + Math.sin(animTimer + i) * 20, canvasH)
        ctx.stroke()
      }
      for (let i = 0; i < 15; i++) {
        ctx.beginPath()
        ctx.moveTo(camera.current.x, i * 50)
        ctx.lineTo(camera.current.x + canvasW, i * 50 + Math.cos(animTimer + i) * 20)
        ctx.stroke()
      }

      // Circuit nodes
      ctx.fillStyle = "#2a5a3a"
      for (let i = 0; i < levelWidth.current / 73; i++) {
        const x = i * 73
        const y = (i * 97) % canvasH
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = "#1a4a3a"
      ctx.strokeStyle = "#2a6a4a"
      ctx.lineWidth = 3
      for (const segment of floorSegments.current) {
        ctx.fillRect(segment.x, groundY, segment.w, 30)
        ctx.strokeRect(segment.x, groundY, segment.w, 30)

        // Circuit pattern on floor
        ctx.fillStyle = "#2a5a3a"
        for (let i = 0; i < segment.w / 25; i++) {
          ctx.fillRect(segment.x + i * 25 + 8, groundY + 8, 12, 12)
        }
        ctx.fillStyle = "#1a4a3a"
      }

      // Draw platforms
      for (const plat of platforms.current) {
        ctx.fillStyle = "#1a4a3a"
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h)

        ctx.strokeStyle = "#2a6a4a"
        ctx.lineWidth = 2
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h)

        ctx.fillStyle = "#2a5a3a"
        for (let i = 0; i < plat.w / 20; i++) {
          ctx.fillRect(plat.x + i * 20 + 5, plat.y + 5, 10, 10)
        }
      }

      // Draw coins
      for (const coin of coins.current) {
        if (coin.collected) continue

        const pulse = Math.sin(coin.animFrame * Math.PI * 2) * 0.2 + 1

        ctx.save()
        ctx.translate(coin.x, coin.y)
        ctx.scale(pulse, pulse)

        ctx.fillStyle = "#FFD700"
        ctx.fillRect(-coin.w / 2, -coin.h / 2, coin.w, coin.h)

        ctx.fillStyle = "#C0C0C0"
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(-coin.w / 2 - 3, -coin.h / 2 + i * 6, 3, 4)
          ctx.fillRect(coin.w / 2, -coin.h / 2 + i * 6, 3, 4)
        }

        ctx.restore()
      }

      // Draw enemies
      for (const enemy of enemies.current) {
        if (!enemy.alive) continue

        ctx.save()
        ctx.translate(enemy.x, enemy.y)

        const spikes = 8
        const spikeLength = 8 + Math.sin(enemy.animFrame * Math.PI) * 3

        ctx.fillStyle = "#FF3366"
        ctx.beginPath()
        for (let i = 0; i < spikes; i++) {
          const angle = (i / spikes) * Math.PI * 2
          const innerRadius = enemy.w / 2
          const outerRadius = innerRadius + spikeLength

          const x1 = Math.cos(angle) * innerRadius
          const y1 = Math.sin(angle) * innerRadius
          const x2 = Math.cos(angle + Math.PI / spikes) * outerRadius
          const y2 = Math.sin(angle + Math.PI / spikes) * outerRadius
          const x3 = Math.cos(angle + (Math.PI * 2) / spikes) * innerRadius
          const y3 = Math.sin(angle + (Math.PI * 2) / spikes) * innerRadius

          if (i === 0) ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.lineTo(x3, y3)
        }
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = "#000"
        ctx.beginPath()
        ctx.arc(-8, -5, 4, 0, Math.PI * 2)
        ctx.arc(8, -5, 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }

      // Draw wormhole
      if (wormhole.current) {
        const wh = wormhole.current
        ctx.save()
        ctx.translate(wh.x, wh.y)

        for (let i = 5; i > 0; i--) {
          const radius = (wh.w / 2) * (i / 5)
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
          gradient.addColorStop(0, `rgba(138, 43, 226, ${0.8 - i * 0.1})`)
          gradient.addColorStop(1, `rgba(75, 0, 130, ${0.4 - i * 0.05})`)

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(0, 0, radius, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
        ctx.lineWidth = 2
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.arc(0, 0, wh.w / 2 - i * 8, wh.animFrame + i, wh.animFrame + i + Math.PI)
          ctx.stroke()
        }

        ctx.restore()
      }

      // Draw player
      drawCharacter(ctx, p, animTimer, grokImg)

      ctx.restore()

      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(10, 10, 250, 80)

      ctx.fillStyle = "#FFF"
      ctx.font = "bold 20px Arial"
      ctx.fillText(`Level: ${gs.level}`, 20, 35)
      ctx.fillText(`Score: ${gs.score}`, 20, 60)
      ctx.fillText(`Lives: ${"❤️".repeat(gs.lives)}`, 20, 85)

      if (gs.gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
        ctx.fillRect(0, 0, canvasW, canvasH)

        ctx.fillStyle = "#FF3366"
        ctx.font = "bold 48px Arial"
        ctx.textAlign = "center"
        ctx.fillText("GAME OVER", canvasW / 2, canvasH / 2 - 40)

        ctx.fillStyle = "#FFF"
        ctx.font = "24px Arial"
        ctx.fillText(`Final Score: ${gs.score}`, canvasW / 2, canvasH / 2 + 20)
        ctx.fillText(`Level Reached: ${gs.level}`, canvasW / 2, canvasH / 2 + 60)
        ctx.textAlign = "left"

        // Trigger game over screen after delay
        setTimeout(() => {
          setGameScreen("gameOver")
        }, 2000)
      }

      if (gs.levelComplete) {
        ctx.fillStyle = "rgba(138, 43, 226, 0.8)"
        ctx.fillRect(0, 0, canvasW, canvasH)

        ctx.fillStyle = "#FFD700"
        ctx.font = "bold 48px Arial"
        ctx.textAlign = "center"
        ctx.fillText("LEVEL COMPLETE!", canvasW / 2, canvasH / 2)

        ctx.fillStyle = "#FFF"
        ctx.font = "24px Arial"
        ctx.fillText(`Next Level: ${gs.level + 1}`, canvasW / 2, canvasH / 2 + 50)
        ctx.textAlign = "left"
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    const handleRestart = () => {
      if (gameState.current.gameOver) {
        gameState.current = {
          level: 1,
          score: 0,
          lives: 3,
          gameOver: false,
          levelComplete: false,
          transitioning: false,
        }
        generateLevel(1)
      }
    }

    canvas.addEventListener("touchstart", handleRestart)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      canvas.removeEventListener("touchstart", handleRestart)
    }
  }, [gameScreen, generateLevel, playSoundEffect, initAudio])

  if (gameScreen === "menu") {
    return <MenuScreen onStart={startGame} onHowToPlay={() => setGameScreen("howToPlay")} />
  }

  if (gameScreen === "howToPlay") {
    return <HowToPlayScreen onBack={() => setGameScreen("menu")} />
  }

  if (gameScreen === "gameOver") {
    return (
      <GameOverScreen
        score={gameState.current.score}
        level={gameState.current.level}
        onRetry={retryGame}
        onQuit={quitToMenu}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0b1114",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {!isLandscape && (
        <div
          style={{
            position: "absolute",
            zIndex: 30,
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.95)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: "bold",
            padding: 30,
            textAlign: "center",
            gap: 20,
          }}
        >
          <div style={{ fontSize: 60 }}>📱</div>
          <div>Please rotate your device</div>
          <div style={{ fontSize: 18, opacity: 0.7 }}>This game requires landscape mode</div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255, 255, 255, 0.6)",
          fontSize: 12,
          fontFamily: "Arial, sans-serif",
          textAlign: "center",
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        Created by David Gutierrez
      </div>

      <Joystick
        onMove={(v) => {
          joyRef.current = v
          initAudio()
        }}
      />
      <JumpButton onJump={requestJump} />
    </div>
  )
}

function MenuScreen({ onStart, onHowToPlay }: { onStart: () => void; onHowToPlay: () => void }) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #0a1a1a 0%, #1a3a2a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background circuit pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
          background: "repeating-linear-gradient(0deg, transparent, transparent 50px, #4ECDC4 50px, #4ECDC4 51px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
          background: "repeating-linear-gradient(90deg, transparent, transparent 50px, #4ECDC4 50px, #4ECDC4 51px)",
        }}
      />

      {/* Animated title */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          animation: "float 3s ease-in-out infinite",
        }}
      >
        <h1
          style={{
            fontSize: 64,
            fontWeight: "bold",
            color: "#4ECDC4",
            textShadow: "0 0 20px rgba(78, 205, 196, 0.5), 0 0 40px rgba(78, 205, 196, 0.3)",
            margin: 0,
            animation: "pulse 2s ease-in-out infinite",
          }}
        >
          CYBER GROK
        </h1>
        <p
          style={{
            fontSize: 24,
            color: "#FFD700",
            textShadow: "0 0 10px rgba(255, 215, 0, 0.5)",
            margin: 0,
            animation: "glow 1.5s ease-in-out infinite alternate",
          }}
        >
          Circuit Runner Adventure
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, zIndex: 10 }}>
        <button
          onClick={onStart}
          style={{
            padding: "20px 60px",
            fontSize: 28,
            fontWeight: "bold",
            color: "#0a1a1a",
            background: "linear-gradient(135deg, #4ECDC4 0%, #2A9D8F 100%)",
            border: "none",
            borderRadius: 15,
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(78, 205, 196, 0.4)",
            transition: "all 0.3s ease",
            animation: "buttonPulse 2s ease-in-out infinite",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.95)"
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)"
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = "scale(0.95)"
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          START GAME
        </button>

        <button
          onClick={onHowToPlay}
          style={{
            padding: "15px 50px",
            fontSize: 22,
            fontWeight: "bold",
            color: "#4ECDC4",
            background: "rgba(78, 205, 196, 0.1)",
            border: "3px solid #4ECDC4",
            borderRadius: 15,
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(78, 205, 196, 0.2)",
            transition: "all 0.3s ease",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.95)"
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)"
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = "scale(0.95)"
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          HOW TO PLAY
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 20,
          color: "rgba(255, 255, 255, 0.5)",
          fontSize: 14,
        }}
      >
        Created by David Gutierrez
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        @keyframes glow {
          from {
            opacity: 0.8;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes buttonPulse {
          0%,
          100% {
            box-shadow: 0 8px 20px rgba(78, 205, 196, 0.4);
          }
          50% {
            box-shadow: 0 8px 30px rgba(78, 205, 196, 0.6);
          }
        }
      `}</style>
    </div>
  )
}

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #0a1a1a 0%, #1a3a2a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
        padding: 40,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <h1
        style={{
          fontSize: 48,
          fontWeight: "bold",
          color: "#4ECDC4",
          textShadow: "0 0 20px rgba(78, 205, 196, 0.5)",
          margin: 0,
        }}
      >
        HOW TO PLAY
      </h1>

      <div
        style={{
          background: "rgba(0, 0, 0, 0.5)",
          padding: 30,
          borderRadius: 20,
          border: "2px solid #4ECDC4",
          maxWidth: 600,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div
            style={{
              fontSize: 40,
              width: 60,
              height: 60,
              background: "rgba(78, 205, 196, 0.2)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🕹️
          </div>
          <div>
            <h3 style={{ color: "#FFD700", margin: 0, fontSize: 20 }}>Move</h3>
            <p style={{ color: "#FFF", margin: 0, fontSize: 16 }}>Use the joystick to move left and right</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div
            style={{
              fontSize: 40,
              width: 60,
              height: 60,
              background: "rgba(78, 205, 196, 0.2)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ⬆️
          </div>
          <div>
            <h3 style={{ color: "#FFD700", margin: 0, fontSize: 20 }}>Jump</h3>
            <p style={{ color: "#FFF", margin: 0, fontSize: 16 }}>Tap the jump button to leap over gaps</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div
            style={{
              fontSize: 40,
              width: 60,
              height: 60,
              background: "rgba(78, 205, 196, 0.2)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            💎
          </div>
          <div>
            <h3 style={{ color: "#FFD700", margin: 0, fontSize: 20 }}>Collect Microchips</h3>
            <p style={{ color: "#FFF", margin: 0, fontSize: 16 }}>Gather golden microchips for points</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div
            style={{
              fontSize: 40,
              width: 60,
              height: 60,
              background: "rgba(78, 205, 196, 0.2)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🦠
          </div>
          <div>
            <h3 style={{ color: "#FFD700", margin: 0, fontSize: 20 }}>Avoid Viruses</h3>
            <p style={{ color: "#FFF", margin: 0, fontSize: 16 }}>Jump on them or dodge the red viruses</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div
            style={{
              fontSize: 40,
              width: 60,
              height: 60,
              background: "rgba(78, 205, 196, 0.2)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🌀
          </div>
          <div>
            <h3 style={{ color: "#FFD700", margin: 0, fontSize: 20 }}>Reach the Wormhole</h3>
            <p style={{ color: "#FFF", margin: 0, fontSize: 16 }}>Enter the purple wormhole to complete the level</p>
          </div>
        </div>
      </div>

      <button
        onClick={onBack}
        style={{
          padding: "15px 50px",
          fontSize: 22,
          fontWeight: "bold",
          color: "#4ECDC4",
          background: "rgba(78, 205, 196, 0.1)",
          border: "3px solid #4ECDC4",
          borderRadius: 15,
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(78, 205, 196, 0.2)",
          transition: "all 0.3s ease",
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.transform = "scale(0.95)"
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = "scale(1)"
        }}
      >
        BACK TO MENU
      </button>
    </div>
  )
}

function GameOverScreen({
  score,
  level,
  onRetry,
  onQuit,
}: {
  score: number
  level: number
  onRetry: () => void
  onQuit: () => void
}) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #1a0a0a 0%, #3a1a1a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
        padding: 40,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <h1
        style={{
          fontSize: 56,
          fontWeight: "bold",
          color: "#FF3366",
          textShadow: "0 0 20px rgba(255, 51, 102, 0.5)",
          margin: 0,
          animation: "shake 0.5s ease-in-out",
        }}
      >
        GAME OVER
      </h1>

      <div
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          padding: 40,
          borderRadius: 20,
          border: "3px solid #FF3366",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          alignItems: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#FFD700", fontSize: 24, margin: 0 }}>Final Score</p>
          <p style={{ color: "#FFF", fontSize: 48, fontWeight: "bold", margin: 0 }}>{score}</p>
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#4ECDC4", fontSize: 20, margin: 0 }}>Level Reached</p>
          <p style={{ color: "#FFF", fontSize: 36, fontWeight: "bold", margin: 0 }}>{level}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 15, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={onRetry}
          style={{
            padding: "18px 45px",
            fontSize: 24,
            fontWeight: "bold",
            color: "#0a1a1a",
            background: "linear-gradient(135deg, #4ECDC4 0%, #2A9D8F 100%)",
            border: "none",
            borderRadius: 15,
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(78, 205, 196, 0.4)",
            transition: "all 0.3s ease",
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = "scale(0.95)"
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          RETRY
        </button>

        <button
          onClick={onRetry}
          style={{
            padding: "18px 40px",
            fontSize: 24,
            fontWeight: "bold",
            color: "#FFD700",
            background: "rgba(255, 215, 0, 0.1)",
            border: "3px solid #FFD700",
            borderRadius: 15,
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(255, 215, 0, 0.3)",
            transition: "all 0.3s ease",
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = "scale(0.95)"
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          RESTART
        </button>

        <button
          onClick={onQuit}
          style={{
            padding: "18px 45px",
            fontSize: 24,
            fontWeight: "bold",
            color: "#FF3366",
            background: "rgba(255, 51, 102, 0.1)",
            border: "3px solid #FF3366",
            borderRadius: 15,
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(255, 51, 102, 0.2)",
            transition: "all 0.3s ease",
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = "scale(0.95)"
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          QUIT
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 20,
          color: "rgba(255, 255, 255, 0.5)",
          fontSize: 14,
        }}
      >
        Created by David Gutierrez
      </div>

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }
      `}</style>
    </div>
  )
}

