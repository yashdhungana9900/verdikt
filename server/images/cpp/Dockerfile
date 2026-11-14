# C++ sandbox image with <bits/stdc++.h> precompiled. Cuts compile time by about 5x.
# Built by `npm run judge:pull`. If the precompile step ever fails the image still works, just slower.
FROM gcc:13
RUN H=$(echo '#include <bits/stdc++.h>' | g++ -std=c++17 -O2 -x c++ -H -E - 2>&1 >/dev/null | grep -m1 'bits/stdc++.h' | sed 's/^\.* //') \
 && g++ -O2 -std=c++17 -x c++-header "$H" -o "$H.gch" \
 || true
