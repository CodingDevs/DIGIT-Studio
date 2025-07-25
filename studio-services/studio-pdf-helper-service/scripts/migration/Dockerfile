FROM egovio/flyway:10.7.1

WORKDIR /flyway

# Copy migration scripts
COPY sql ./sql
COPY migration.sh .

# Make script executable
RUN chmod +x ./migration.sh

ENTRYPOINT ["./migration.sh"]
