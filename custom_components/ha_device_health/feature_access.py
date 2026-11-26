"""Pure Device Health feature policy, independent of HA and all IO.

Each operation grants only this tool's access. Callers supply the fresh actual
HA actor and enforce native resource permissions before IO. Management,
migration and policy repair stay admin-only outside this catalog. Visibility
never implies read or execute access, and admins obey explicit user allowlists.
"""
import json
import math
import unicodedata

_MAX_BYTES = 64 * 1024
_MAX_DEPTH = 64
_CATALOG = {
    'diagnostics': {'visible': 'household', 'read': 'household'},
    'history': {'visible': 'household', 'read': 'household'},
    'actions': {'visible': 'household', 'read': 'household', 'execute': 'household'},
}
_MODES = frozenset(('inherit', 'household', 'admin', 'selected_users'))
_ERROR = 'invalid_feature_access'


def default_feature_access():
    """Return a fresh policy preserving the catalog's legacy role defaults."""
    return {'schema': 1, 'features': {}}


def _bounded_json(value):
    """Bound traversal before serialization; reject cycles and non-JSON values.

    The byte budget here is a lower bound; final JSON encoding also accounts
    for escaping. Pending children, nodes, strings and nesting are bounded so
    even hostile oversized input cannot cause an unbounded deepcopy/JSON walk.
    """
    stack = [(value, 0, False)]
    ancestors = set()
    budget = nodes = 0
    while stack:
        item, depth, leaving = stack.pop()
        kind = type(item)
        if leaving:
            ancestors.remove(id(item))
            continue
        nodes += 1
        if nodes > _MAX_BYTES or depth > _MAX_DEPTH:
            raise ValueError(_ERROR)
        if kind in (dict, list):
            length = len(item)
            if id(item) in ancestors or length > _MAX_BYTES:
                raise ValueError(_ERROR)
            if len(stack) + length > _MAX_BYTES:
                raise ValueError(_ERROR)
            budget += 2 + max(0, length - 1)
            ancestors.add(id(item))
            stack.append((item, depth, True))
            if kind is dict:
                for key, child in item.items():
                    if type(key) is not str or len(key) > _MAX_BYTES:
                        raise ValueError(_ERROR)
                    budget += len(key.encode('utf-8')) + 3
                    if budget > _MAX_BYTES:
                        raise ValueError(_ERROR)
                    stack.append((child, depth + 1, False))
            else:
                stack.extend((child, depth + 1, False) for child in item)
        elif kind is str:
            if len(item) > _MAX_BYTES:
                raise ValueError(_ERROR)
            budget += len(item.encode('utf-8')) + 2
        elif item is None or kind is bool:
            budget += 4 if item is None or item is True else 5
        elif kind is int:
            if item.bit_length() > _MAX_BYTES:
                raise ValueError(_ERROR)
            budget += max(1, item.bit_length() // 4)
        elif kind is float and math.isfinite(item):
            budget += 1
        else:
            raise ValueError(_ERROR)
        if budget > _MAX_BYTES:
            raise ValueError(_ERROR)
    encoded = json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
    if len(encoded.encode('utf-8')) > _MAX_BYTES:
        raise ValueError(_ERROR)


def _valid_user_id(value):
    return (type(value) is str and 0 < len(value) <= 128
            and value == value.strip()
            and not any(unicodedata.category(char) == 'Cc' for char in value))


def validate_feature_access(policy):
    """Return detached normalized strict schema 1 JSON, or a safe ValueError."""
    try:
        _bounded_json(policy)
        if (type(policy) is not dict or set(policy) != {'schema', 'features'}
                or type(policy['schema']) is not int or policy['schema'] != 1
                or type(policy['features']) is not dict):
            raise ValueError(_ERROR)
        features = {}
        for feature, operations in policy['features'].items():
            if feature not in _CATALOG or type(operations) is not dict:
                raise ValueError(_ERROR)
            clean = {}
            for operation, rule in operations.items():
                if operation not in _CATALOG[feature] or type(rule) is not dict:
                    raise ValueError(_ERROR)
                mode = rule.get('mode')
                if type(mode) is not str or mode not in _MODES:
                    raise ValueError(_ERROR)
                expected = {'mode', 'user_ids'} if mode == 'selected_users' else {'mode'}
                # selected_users may omit user_ids: an empty allowlist denies.
                if mode == 'selected_users' and set(rule) == {'mode'}:
                    ids = []
                elif set(rule) == expected:
                    ids = rule.get('user_ids', [])
                else:
                    raise ValueError(_ERROR)
                clean[operation] = {'mode': mode}
                if mode == 'selected_users':
                    if type(ids) is not list or len(ids) > 128 or not all(_valid_user_id(uid) for uid in ids):
                        raise ValueError(_ERROR)
                    clean[operation]['user_ids'] = sorted(set(ids))
            features[feature] = clean
        return {'schema': 1, 'features': features}
    except (ValueError, TypeError, OverflowError, RecursionError):
        raise ValueError(_ERROR) from None


def _allowed(policy, feature, operation, user_id, is_active, is_admin):
    if (type(feature) is not str or feature not in _CATALOG
            or type(operation) is not str or operation not in _CATALOG[feature]):
        return False
    if is_active is not True or not _valid_user_id(user_id):
        return False
    rule = policy['features'].get(feature, {}).get(operation, {'mode': 'inherit'})
    mode = rule['mode']
    if mode == 'inherit':
        mode = _CATALOG[feature][operation]
    return (mode == 'household'
            or (mode == 'admin' and is_admin is True)
            or (mode == 'selected_users' and user_id in rule['user_ids']))


def feature_access_allowed(policy, feature, operation, *, user_id, is_active, is_admin):
    """Validate every call; evaluate only this tool's independent operation gate.

    user_id and flags must come from the fresh actual authenticated HA user,
    never a client-supplied target. A malformed policy always raises ValueError.
    Even an active admin cannot bypass malformed input or unsupported operations.
    """
    normalized = validate_feature_access(policy)
    return _allowed(normalized, feature, operation, user_id, is_active, is_admin)


def effective_feature_capabilities(policy, *, user_id, is_active, is_admin):
    """Project catalog operation booleans without exposing IDs or allowlists."""
    normalized = validate_feature_access(policy)
    return {feature: {operation: _allowed(normalized, feature, operation, user_id, is_active, is_admin)
                      for operation in operations}
            for feature, operations in _CATALOG.items()}
