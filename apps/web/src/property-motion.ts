import type {Game} from '../../../packages/core/types';
export type PropertyMotion = {key: string; property: number; kind: 'ownership'|'build'|'rent'; previousLevel?: number; level?: number; payer?: string};
/** Fresh authoritative changes, including deeds and rent belonging to other players. */
export function propertyMotions(before: Game|null, after: Game): PropertyMotion[] {
  if (!before || after.eventSeq <= before.eventSeq) return [];
  const effects: PropertyMotion[] = [];
  after.properties.forEach((property, index) => {
    const previous = before.properties[index]; if (!previous) return;
    if (property.owner && property.owner !== previous.owner) effects.push({key: `ownership:${after.eventSeq}:${index}`, property: index, kind: 'ownership'});
    if (property.level > previous.level) effects.push({key: `build:${after.eventSeq}:${index}`, property: index, kind: 'build', previousLevel: previous.level, level: property.level});
  });
  const seen = new Set<string>();
  for (const event of after.log) {
    const payment = event.payment, index = payment?.property;
    if (event.id <= before.eventSeq || !payment || index === undefined || !payment.to || payment.amount <= 0 || !after.properties[index]) continue;
    const key = `rent:${event.id}:${index}`; if (seen.has(key)) continue; seen.add(key);
    effects.push({key, property: index, kind: 'rent', payer: payment.from});
  }
  return effects;
}

export function propertyMotionStart(motion: PropertyMotion, now: number, arrival: number) {
  return motion.kind === 'rent' ? Math.max(now, arrival) : now;
}

/** Cosmetic effects finish independently of the turn playback clock. */
export function propertyMotionPose(kind: PropertyMotion['kind'], elapsed: number, reduced = false) {
  if (reduced || elapsed >= 1200) return {done: true, visible: false, opacity: 0, ringScale: 1, growth: 1};
  const t = Math.max(0, elapsed / 1200), grow = Math.max(0, Math.min(1, elapsed / 1000));
  const growth = kind === 'build' ? Math.max(.001, 1 - (1 - grow) ** 3) : 1;
  return {done: false, visible: elapsed >= 0, opacity: (1 - t) * (.55 + .30 * Math.sin(t * Math.PI * 4) ** 2),
    ringScale: 1 + Math.sin(t * Math.PI) * .13, growth};
}
