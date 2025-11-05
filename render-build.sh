#!/usr/bin/env bash
set -euo pipefail

./audiveris/gradlew :app:installDist

pushd omr-backend > /dev/null
./mvnw -B clean package
popd > /dev/null
