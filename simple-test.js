const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`收到请求: ${req.method} ${req.url}`);
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  
  if (req.url === '/health') {
    res.end(JSON.stringify({
      status: 'success',
      message: '简单测试服务器工作正常！',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.end(JSON.stringify({
      status: 'success',
      message: 'Hello from simple test server!',
      url: req.url
    }));
  }
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`🚀 简单测试服务器启动成功！`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
});

server.on('error', (err) => {
  console.error('❌ 服务器错误:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ 端口 ${PORT} 已被占用！`);
    console.log('💡 请尝试关闭其他使用此端口的程序或使用不同端口');
  }
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n📴 关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

console.log('⏳ 正在启动服务器...');




