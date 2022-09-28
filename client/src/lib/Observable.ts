export class Observable {
  private observers: Function[] = [];
  value: any;
  constructor() {}

  next(value: any) {
    this.value = value;
    this.observers.forEach((observer) => observer(value));
  }
  subscribe(fn: (value: any) => any) {
    this.observers.push(fn);
  }
  unsubscribe() {
    this.observers = [];
  }
}
