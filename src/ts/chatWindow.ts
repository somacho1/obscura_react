export interface ChatPosition { x: number; y: number; }
// 창 크기 변경·드래그 후에도 상담창이 화면 밖으로 사라지지 않도록 합니다.
export function clampChatPosition(position: ChatPosition, width: number, height: number, viewportWidth: number, viewportHeight: number): ChatPosition {
    const margin = 12;
    return {
        x: Math.max(margin, Math.min(position.x, Math.max(margin, viewportWidth - width - margin))),
        y: Math.max(margin, Math.min(position.y, Math.max(margin, viewportHeight - height - margin))),
    };
}
