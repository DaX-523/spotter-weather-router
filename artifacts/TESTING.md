test doc

 Test tables come first, covering boundaries such as 149.9 / 150 / 600 / 600.1 mi.

 stubs through httpx.MockTransport, covering success, empty
   results, timeouts, non-2xx and malformed bodies. Fakes for every port go in tests/fakes.py.

 Tests cover every tie-break: equal severe miles decided by high miles, and so on down to travel time.