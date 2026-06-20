# IQueue Prototype Data Card

## Dataset

The forecasting dataset is synthetic route-day passenger demand for six
Mindanao intercity routes. It includes calendar, weekend, ASEAN holiday, and
terminal-closure fields. Passenger and learning-loop demo records are also
synthetic and contain no real personally identifiable information.

## Intended Use

The data supports architecture validation, model comparison, user-interface
testing, and queue-operation simulation for the hackathon prototype. It must
not be used to claim measured reductions in wait time, overcrowding, or missed
boardings.

## Governance

- Large raw and cleaned datasets are DVC-managed.
- Generated model bundles remain outside Git; manifests and checksums are tracked.
- Train, validation, and test dates are chronological and non-overlapping.
- Outcome fields are targets and are excluded from pre-departure features.
- Language/lifestyle seat matching requires explicit passenger opt-in.

## Known Gaps

Before a real deployment, IQueue needs operator-provided ridership, queue,
dispatch, incident, and service-quality data; privacy review; retention rules;
tenant authentication; and route-by-route external validation.
