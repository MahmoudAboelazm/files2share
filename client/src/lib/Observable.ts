export class Observable<Type> {
  private observers: Function[] = [];
  value: Type;
  constructor() {}

  next(value: Type) {
    this.value = value;
    this.observers.forEach((observer) => observer(value));
  }
  subscribe(fn: (value: Type) => void) {
    this.observers.push(fn);
  }
  unsubscribe() {
    this.observers = [];
  }
}
