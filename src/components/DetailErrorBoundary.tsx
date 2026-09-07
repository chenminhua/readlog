import { Component } from "react";
import type { ReactNode } from "react";

export class DetailErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="status-panel" role="alert">
          <p>阅读页面暂时无法加载，请刷新后重试。</p>
          <button className="text-button" type="button" onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
