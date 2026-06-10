FROM maven:3.8.5-openjdk-17-slim AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

FROM openjdk:17-jdk-slim
WORKDIR /app

RUN mkdir -p /app/data && \
    useradd -u 1001 appuser && \
    chown -R appuser:appuser /app

COPY --from=build /app/target/*.jar app.jar

USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
