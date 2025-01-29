FROM openjdk:11-jre-slim
COPY lib/build/libs/ratpack-service.jar /app/ratpack-service.jar
EXPOSE 5050
ENTRYPOINT ["java", "-jar", "/app/ratpack-service.jar"]