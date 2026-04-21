export type DormancyState = 'dormant' | 'awake' | 'processing';

export class DormancyController {
  private state: DormancyState = 'dormant';
  private lastWakeTime: Date | null = null;

  shouldWake(lastProcessedBuild: number, latestBuild: number): boolean {
    if (this.state === 'processing') return false;
    return latestBuild > lastProcessedBuild;
  }

  wake(): void {
    if (this.state === 'processing') return;
    this.state = 'awake';
    this.lastWakeTime = new Date();
  }

  startProcessing(): void {
    this.state = 'processing';
  }

  sleep(): void {
    this.state = 'dormant';
  }

  getState(): DormancyState {
    return this.state;
  }

  getLastWakeTime(): Date | null {
    return this.lastWakeTime;
  }
}
