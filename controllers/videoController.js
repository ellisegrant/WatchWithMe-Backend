import roomManager from '../utils/roomManager.js';

export const handleVideoUrlChange = (socket, io) => {
  socket.on('video-url-change', ({ roomId, videoUrl }) => {
    const room = roomManager.getRoom(roomId);
    if (room) {
      room.videoUrl = videoUrl;
      room.currentVideoIndex = 0; // Reset to first video
      console.log(` Video changed in room ${roomId}: ${videoUrl}`);
    }
    io.to(roomId).emit('video-url-changed', videoUrl);
  });
};


export const handleVideoEnded = (socket, io) => {
  socket.on('video-ended', ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    // Check if there are videos in queue
    if (room.queue && room.queue.length > 0) {
      const nextVideo = room.queue.shift(); // Remove first video from queue
      room.videoUrl = nextVideo.videoUrl;
      
      console.log(`⏭️ Auto-playing next video in room ${roomId}: ${nextVideo.title}`);
      
      io.to(roomId).emit('video-url-changed', nextVideo.videoUrl);
      io.to(roomId).emit('queue-updated', room.queue);
    } else {
      console.log(`🏁 Queue finished in room ${roomId}`);
      io.to(roomId).emit('queue-finished');
    }
  });
};





export const handlePlayVideo = (socket, io) => {
  socket.on('play-video', ({ roomId, currentTime }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    if (room.playbackControl === 'admin-only' && socket.id !== room.admin) {
      socket.emit('error', 'Only admin can control playback');
      return;
    }

    socket.to(roomId).emit('video-play', currentTime);
  });
};

export const handlePauseVideo = (socket, io) => {
  socket.on('pause-video', ({ roomId, currentTime }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    if (room.playbackControl === 'admin-only' && socket.id !== room.admin) {
      socket.emit('error', 'Only admin can control playback');
      return;
    }

    socket.to(roomId).emit('video-pause', currentTime);
  });
};

// NEW VIDEO FEATURES

export const handleAddToQueue = (socket, io) => {
  socket.on('add-to-queue', ({ roomId, videoUrl, title }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const queueItem = {
      id: Date.now() + Math.random(),
      videoUrl,
      title: title || 'Untitled Video',
      addedBy: socket.id
    };

    room.queue.push(queueItem);
    console.log(` Video added to queue in room ${roomId}`);

    io.to(roomId).emit('queue-updated', room.queue);
  });
};

export const handleRemoveFromQueue = (socket, io) => {
  socket.on('remove-from-queue', ({ roomId, queueItemId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    room.queue = room.queue.filter(item => item.id !== queueItemId);
    console.log(`➖ Video removed from queue in room ${roomId}`);

    io.to(roomId).emit('queue-updated', room.queue);
  });
};

export const handlePlayNext = (socket, io) => {
  socket.on('play-next', ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.queue.length === 0) return;

    const nextVideo = room.queue.shift();
    room.videoUrl = nextVideo.videoUrl;

    console.log(` Playing next video in room ${roomId}`);

    io.to(roomId).emit('video-url-changed', nextVideo.videoUrl);
    io.to(roomId).emit('queue-updated', room.queue);
  });
};

export const handleChangePlaybackSpeed = (socket, io) => {
  socket.on('change-playback-speed', ({ roomId, speed }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    room.playbackSpeed = speed;
    console.log(`⚡ Playback speed changed to ${speed}x in room ${roomId}`);

    io.to(roomId).emit('playback-speed-changed', speed);
  });
};

export const handleChangeVolume = (socket, io) => {
  socket.on('change-volume', ({ roomId, volume }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    room.volume = volume;
    console.log(`🔊 Volume changed to ${volume}% in room ${roomId}`);

    socket.to(roomId).emit('volume-changed', volume);
  });
};

export const handleAddBookmark = (socket, io) => {
  socket.on('add-bookmark', ({ roomId, name, time, videoId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const bookmark = {
      id: Date.now() + Math.random(),
      name,
      time,
      videoId,
      createdBy: socket.id
    };

    room.bookmarks.push(bookmark);
    console.log(`🔖 Bookmark added in room ${roomId}: ${name} at ${time}s`);

    io.to(roomId).emit('bookmarks-updated', room.bookmarks);
  });
};

export const handleRemoveBookmark = (socket, io) => {
  socket.on('remove-bookmark', ({ roomId, bookmarkId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    room.bookmarks = room.bookmarks.filter(b => b.id !== bookmarkId);
    console.log(` Bookmark removed in room ${roomId}`);

    io.to(roomId).emit('bookmarks-updated', room.bookmarks);
  });
};

export const handleJumpToBookmark = (socket, io) => {
  socket.on('jump-to-bookmark', ({ roomId, time }) => {
    io.to(roomId).emit('seek-to-time', time);
  });
};