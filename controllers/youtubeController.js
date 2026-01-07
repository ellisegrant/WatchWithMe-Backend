import axios from 'axios';



const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export const handleSearchYouTube = (socket) => {
  socket.on('search-youtube', async ({ query }) => {
    try {
      console.log(`🔍 Searching YouTube for: ${query}`);

      const response = await axios.get('https://youtube-v31.p.rapidapi.com/search', {
        params: {
          q: query,
          part: 'snippet',
          maxResults: '10',
          type: 'video'
        },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'youtube-v31.p.rapidapi.com'
        }
      });

      const videos = response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt
      }));

      console.log(`✅ Found ${videos.length} videos`);
      socket.emit('search-results', videos);
    } catch (error) {
      console.error('❌ YouTube search error:', error.response?.data || error.message);
      socket.emit('error', 'Failed to search YouTube. Check your RapidAPI key.');
    }
  });
};

export const handleGetVideoDetails = (socket) => {
  socket.on('get-video-details', async ({ videoId }) => {
    try {
      const response = await axios.get('https://youtube-v31.p.rapidapi.com/videos', {
        params: {
          part: 'contentDetails,statistics,snippet',
          id: videoId
        },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'youtube-v31.p.rapidapi.com'
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        socket.emit('error', 'Video not found');
        return;
      }

      const video = response.data.items[0];
      
      // Parse ISO 8601 duration (PT1H2M10S -> 1:02:10)
      const duration = parseDuration(video.contentDetails.duration);
      
      const details = {
        id: videoId,
        title: video.snippet.title,
        duration: duration,
        viewCount: parseInt(video.statistics.viewCount).toLocaleString(),
        likeCount: parseInt(video.statistics.likeCount || 0).toLocaleString(),
        thumbnail: video.snippet.thumbnails.high.url,
        channelTitle: video.snippet.channelTitle
      };

      socket.emit('video-details', details);
    } catch (error) {
      console.error('Get video details error:', error.message);
      socket.emit('error', 'Failed to get video details');
    }
  });
};

// Helper function to parse YouTube duration
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}