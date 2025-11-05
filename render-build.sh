#!/usr/bin/env sh
set -eu

chmod +x audiveris/gradlew
./audiveris/gradlew :app:installDist

(
	cd omr-backend
	./mvnw -B clean package
)
