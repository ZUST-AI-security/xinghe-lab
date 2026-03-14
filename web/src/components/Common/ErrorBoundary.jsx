/**
 * 星河智安 (XingHe ZhiAn) - 错误边界组件
 * 捕获React组件渲染错误
 */

import React from 'react';
import { Result, Button } from 'antd';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新state使下一次渲染能够显示降级后的UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 你同样可以将错误日志上报给服务器
    console.error('ErrorBoundary捕获到错误:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // 你可以自定义降级后的UI并渲染
      return (
        <Result
          status="error"
          title="页面渲染出错"
          subTitle="抱歉，页面遇到了一个渲染错误。请尝试刷新页面。"
          extra={[
            <Button type="primary" onClick={this.handleReset}>
              重新加载
            </Button>
          ]}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
