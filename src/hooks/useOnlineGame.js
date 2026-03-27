import { useState, useCallback, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = 'https://tictactoe-multiplayer-75ud.onrender.com/';

/**
 * Custom hook that encapsulates all Socket.IO multiplayer logic.
 * Supports JWT authentication and game reconnection.
 */
export const useOnlineGame = () => {
  const socketRef = useRef(null);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState(null);

  // Room / game state
  const [roomId, setRoomId] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [onlineBoard, setOnlineBoard] = useState(Array(9).fill(null));
  const [onlineTurn, setOnlineTurn] = useState('X');
  const [gameResult, setGameResult] = useState(null);
  const [onlineMoves, setOnlineMoves] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [players, setPlayers] = useState([]);

  /**
   * Open a Socket.IO connection to the backend.
   * Passes JWT token in handshake for server-side auth.
   * @param {string|null} token - JWT token, or null for guest.
   */
  const connect = useCallback((token = null) => {
    if (socketRef.current?.connected) return;

    setError(null);

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('✅ Connected to server:', socket.id);
      setIsConnected(true);
      setError(null);

      // Attempt reconnection if we had a room
      const savedRoom = sessionStorage.getItem('ttt-roomId');
      if (savedRoom && token) {
        socket.emit('reconnectToRoom', { roomId: savedRoom }, (response) => {
          if (response.success) {
            console.log('🔄 Reconnected to room:', response.roomId);
            setRoomId(response.roomId);
            setPlayerSymbol(response.symbol);
            setOnlineBoard(response.board);
            setOnlineTurn(response.currentTurn);
            setGameStarted(response.status === 'in_progress' || response.status === 'completed');
            setPlayers(response.players || []);
            if (response.result) setGameResult(response.result);
            setIsWaiting(false);
          } else {
            sessionStorage.removeItem('ttt-roomId');
          }
        });
      }
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
      setError('Could not connect to game server. Is the backend running?');
      setIsConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
      setIsConnected(false);
    });

    // --- Game events ---

    socket.on('gameStart', (data) => {
      console.log('🎮 Game started!', data);
      setOnlineBoard(data.board);
      setOnlineTurn(data.currentTurn);
      setGameStarted(true);
      setIsWaiting(false);
      setGameResult(null);
      setOpponentLeft(false);
      setPlayers(data.players || []);
    });

    socket.on('gameUpdate', (data) => {
      console.log('📝 Game update:', data);
      setOnlineBoard([...data.board]);
      setOnlineTurn(data.currentTurn);
      setOnlineMoves(data.moves || []);
      if (data.result) {
        setGameResult(data.result);
      }
    });

    socket.on('opponentDisconnected', (data) => {
      console.log('👋 Opponent left:', data.message);
      setOpponentLeft(true);
      setIsWaiting(false);
    });

    socket.on('opponentReconnected', (data) => {
      console.log('🔄 Opponent reconnected:', data.message);
      setOpponentLeft(false);
    });

    socketRef.current = socket;
  }, []);

  /**
   * Tear down the socket connection and reset all online state.
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    sessionStorage.removeItem('ttt-roomId');
    setIsConnected(false);
    setIsWaiting(false);
    setRoomId(null);
    setPlayerSymbol(null);
    setOnlineBoard(Array(9).fill(null));
    setOnlineTurn('X');
    setGameResult(null);
    setOnlineMoves([]);
    setGameStarted(false);
    setOpponentLeft(false);
    setPlayers([]);
    setError(null);
  }, []);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  /**
   * Create a new game room (this player becomes X).
   */
  const createRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Not connected to server.');
      return;
    }

    setError(null);
    socket.emit('createRoom', {}, (response) => {
      if (response.success) {
        console.log('🏠 Room created:', response.roomId);
        setRoomId(response.roomId);
        setPlayerSymbol(response.symbol);
        setIsWaiting(true);
        setGameStarted(false);
        setOpponentLeft(false);
        sessionStorage.setItem('ttt-roomId', response.roomId);
      } else {
        setError(response.message || 'Failed to create room.');
      }
    });
  }, []);

  /**
   * Join an existing game room by code (this player becomes O).
   */
  const joinRoom = useCallback((code) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Not connected to server.');
      return;
    }
    if (!code || code.trim().length === 0) {
      setError('Please enter a room code.');
      return;
    }

    setError(null);
    const trimmedCode = code.trim().toUpperCase();
    socket.emit('joinRoom', { roomId: trimmedCode }, (response) => {
      if (response.success) {
        console.log('🤝 Joined room:', response.roomId);
        setRoomId(response.roomId);
        setPlayerSymbol(response.symbol);
        setIsWaiting(false);
        sessionStorage.setItem('ttt-roomId', response.roomId);
      } else {
        setError(response.message || 'Failed to join room.');
      }
    });
  }, []);

  /**
   * Send a move to the server.
   */
  const sendMove = useCallback((position) => {
    const socket = socketRef.current;
    if (!socket?.connected || !roomId) return;

    socket.emit('playerMove', { roomId, position }, (response) => {
      if (!response.success) {
        console.warn('Move rejected:', response.message);
        setError(response.message);
      }
    });
  }, [roomId]);

  /**
   * Leave the current room and reset for a new game (stays connected).
   */
  const leaveRoom = useCallback(() => {
    sessionStorage.removeItem('ttt-roomId');
    setRoomId(null);
    setPlayerSymbol(null);
    setOnlineBoard(Array(9).fill(null));
    setOnlineTurn('X');
    setGameResult(null);
    setOnlineMoves([]);
    setGameStarted(false);
    setIsWaiting(false);
    setOpponentLeft(false);
    setPlayers([]);
    setError(null);
  }, []);

  return {
    // state
    isConnected,
    isWaiting,
    error,
    roomId,
    playerSymbol,
    onlineBoard,
    onlineTurn,
    gameResult,
    onlineMoves,
    gameStarted,
    opponentLeft,
    players,
    // actions
    connect,
    disconnect,
    createRoom,
    joinRoom,
    sendMove,
    leaveRoom,
  };
};
