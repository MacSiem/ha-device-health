"""Pure classification shared by native entities; absent observations stay unknown."""
import math

def classify(devices, entries, states, threshold=20):
    connections = {device_id: [] for device_id in devices}
    batteries = {}
    for entity_id, state in states.items():
        entry = entries.get(entity_id)
        device_id = getattr(entry, 'device_id', None)
        attrs = state.attributes
        value = state.state
        if device_id in connections and value not in ('unknown', 'unavailable'):
            if entity_id.startswith('binary_sensor.') and attrs.get('device_class') == 'connectivity' and value in ('on', 'off'):
                connections[device_id].append(value != 'off')
            elif (entity_id.startswith('device_tracker.') and attrs.get('source_type') != 'gps'
                  and attrs.get('tracking_type') != 'position'
                  and (attrs.get('source_type') == 'router' or attrs.get('tracking_type') == 'connection')
                  and isinstance(value, str) and value.strip()):
                connections[device_id].append(value != 'not_home')
        name_match = '_battery' in entity_id or 'battery_level' in entity_id
        if attrs.get('unit_of_measurement') != '%' or not (attrs.get('device_class') == 'battery' or (not attrs.get('device_class') and name_match)):
            continue
        try:
            level = float(value)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(level) or not 0 <= level <= 100:
            continue
        # Multiple sensors on a device describe one device. Unlinked sensors have
        # no proven physical identity and are intentionally counted individually.
        key = device_id if device_id in connections else entity_id
        batteries[key] = min(level, batteries.get(key, level))
    measured = [links for links in connections.values() if links]
    offline = sum(not any(links) for links in measured) if measured else None
    low = sum(level <= threshold for level in batteries.values()) if batteries else None
    problem = True if (offline and offline > 0) or (low and low > 0) else (False if offline is not None and low is not None else None)
    return offline, low, problem
