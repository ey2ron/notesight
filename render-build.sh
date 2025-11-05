#!/usr/bin/env sh
set -eu

./audiveris/gradlew :app:installDist

(
	cd omr-backend
	./mvnw -B clean package
)
