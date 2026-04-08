"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button, Result, Typography } from "antd";

const { Paragraph, Text } = Typography;

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback content. If omitted, a default Result is shown. */
  fallback?: ReactNode;
  /** Called when the user clicks the retry button. If omitted, the boundary resets state. */
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Unhandled error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle="An unexpected error occurred. You can try again or continue using the app."
          extra={[
            <Button type="primary" key="retry" onClick={this.handleRetry}>
              Try Again
            </Button>,
          ]}
        >
          {this.state.error && (
            <Paragraph>
              <Text type="danger" style={{ fontSize: 12 }}>
                {this.state.error.message}
              </Text>
            </Paragraph>
          )}
        </Result>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
